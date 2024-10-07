// pages/api/quickpayCallback.js

import crypto from 'crypto';
import { db } from '../../lib/firebaseAdmin';
import { sendOrderConfirmation } from '../../lib/email';

export default async function handler(req, res) {
  const apiKey = process.env.QUICKPAY_API_KEY;
  const checksumHeader = req.headers['quickpay-checksum-sha256'];
  const bodyAsString = JSON.stringify(req.body);
  const computedChecksum = crypto
    .createHmac('sha256', apiKey)
    .update(bodyAsString)
    .digest('hex');

  if (checksumHeader !== computedChecksum) {
    console.error('Invalid Quickpay signature');
    return res.status(403).json({ message: 'Invalid signature' });
  }

  const payment = req.body;
  const orderId = payment.order_id;

  try {
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
        const emailSent = await sendOrderConfirmation(orderData.customerDetails.email, updatedOrderData);

        // Only update orderConfirmationSend fields if email was sent successfully
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
