// pages/api/quickpayCallback.js

import crypto from 'crypto';
import getRawBody from 'raw-body';
import { db } from '../../lib/firebaseAdmin';
import { sendOrderConfirmation } from '../../lib/email';

// Disable Next.js's default body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    console.log('Request Headers:', req.headers);
    // const apiKey = process.env.QUICKPAY_API_KEY;
    // const checksumHeader = req.headers['quickpay-checksum-sha256'];

    // Get the raw body as a buffer
    const rawBodyBuffer = await getRawBody(req);
    const rawBodyString = rawBodyBuffer.toString('utf-8');

    // // Compute the checksum over the raw body
    // const computedChecksum = crypto
    //   .createHmac('sha256', apiKey)
    //   .update(rawBodyString)
    //   .digest('hex');

    // if (checksumHeader !== computedChecksum) {
    //   console.error('Invalid Quickpay signature');
    //   console.log('Expected Checksum:', checksumHeader);
    //   console.log('Computed Checksum:', computedChecksum);
    //   console.log('Raw Request Body:', rawBodyString);

    //   return res.status(403).json({ message: 'Invalid signature' });
    // }

    // Parse the raw body into a JavaScript object
    const payment = JSON.parse(rawBodyString);
    const orderId = payment.order_id;

    // Rest of your code remains the same...
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
    };

    await orderRef.set(updatedOrderData);

    // Send order confirmation if payment is accepted
    if (payment.accepted) {
      await sendOrderConfirmation(orderData.customerDetails.email, updatedOrderData);
    }

    res.status(200).json({ message: 'Order updated successfully' });
  } catch (error) {
    console.error('Error processing callback:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
