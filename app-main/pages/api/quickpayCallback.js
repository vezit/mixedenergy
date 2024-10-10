import crypto from 'crypto';
import getRawBody from 'raw-body';
import { db } from '../../lib/firebaseAdmin';
import { sendOrderConfirmation } from '../../lib/email';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const apiKey = process.env.QUICKPAY_API_KEY;
  const checksumHeader = req.headers['quickpay-checksum-sha256'];

  try {
    // Get the raw body as a buffer
    const rawBody = await getRawBody(req);
    const rawBodyString = rawBody.toString('utf8');

    // Compute the checksum using the raw body
    const computedChecksum = crypto
      .createHmac('sha256', apiKey)
      .update(rawBody)
      .digest('hex');

    console.log('Expected Checksum:', checksumHeader);
    console.log('Computed Checksum:', computedChecksum);

    if (checksumHeader !== computedChecksum) {
      console.error(`Checksum mismatch. Expected ${checksumHeader}, but got ${computedChecksum}`);
      return res.status(403).json({ message: 'Invalid signature' });
    }

    // Parse the raw body to JSON
    const payment = JSON.parse(rawBodyString);
    const orderId = payment.order_id;

    // Proceed with order handling...
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      console.error(`Order ${orderId} does not exist`);
      return res.status(404).json({ message: 'Order not found' });
    }

    const orderData = orderDoc.data();

    // Update order status based on payment acceptance
    const updatedOrderData = {
      ...orderData,
      status: payment.accepted ? 'paid' : 'failed',
      paymentDetails: payment,
      updatedAt: new Date(),
      orderConfirmationSent: false,
      orderConfirmationSentAt: null,
    };

    // Send order confirmation if payment is accepted
    if (payment.accepted) {
      try {
        const emailSent = await sendOrderConfirmation(
          orderData.customerDetails.email,
          updatedOrderData
        );
        if (emailSent) {
          updatedOrderData.orderConfirmationSent = true;
          updatedOrderData.orderConfirmationSentAt = new Date();
        }
      } catch (emailError) {
        console.error('Error sending order confirmation email:', emailError);
      }
    }

    // Update Firestore with the final order data
    await orderRef.set(updatedOrderData);

    res.status(200).json({ message: 'Order updated successfully' });
  } catch (error) {
    console.error('Error processing callback:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
