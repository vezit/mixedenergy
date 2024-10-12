// pages/api/quickpayCallback.js

import crypto from 'crypto';
import { db } from '../../lib/firebaseAdmin';
import { sendOrderConfirmation } from '../../lib/email';
import getRawBody from 'raw-body';

export const config = {
  api: {
    bodyParser: false, // Disable automatic body parsing
  },
};

export default async function handler(req, res) {
  const apiKey = process.env.QUICKPAY_API_KEY;
  const checksumHeader = req.headers['quickpay-checksum-sha256'];

  try {
    // Get the raw body as a buffer
    const rawBody = await getRawBody(req);

    // Compute the checksum on the raw body
    const computedChecksum = crypto
      .createHmac('sha256', apiKey)
      .update(rawBody)
      .digest('hex');

    console.log('Received checksum:', checksumHeader);
    console.log('Computed checksum:', computedChecksum);

    // // Uncomment the following block to verify the checksum
    // if (checksumHeader !== computedChecksum) {
    //   console.error('Invalid QuickPay signature');
    //   return res.status(403).json({ message: 'Invalid signature' });
    // }

    // Parse the raw body into a JSON object
    const payment = JSON.parse(rawBody.toString('utf8'));
    const orderId = payment.order_id;

    // Rest of your code remains the same
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
      orderConfirmationSend: false,
      orderConfirmationSendAt: null,
    };

    // Send order confirmation if payment is accepted
    if (payment.accepted) {
      try {
        const emailSent = await sendOrderConfirmation(
          orderData.customerDetails.email,
          updatedOrderData
        );
        if (emailSent) {
          updatedOrderData.orderConfirmationSend = true;
          updatedOrderData.orderConfirmationSendAt = new Date();
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
