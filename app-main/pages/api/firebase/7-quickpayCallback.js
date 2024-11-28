import { db } from '../../../lib/firebaseAdmin';
import axios from 'axios';

export default async function handler(req, res) {
  try {
    const paymentId = req.body.id || req.query.id;

    if (!paymentId) {
      return res.status(400).json({ message: 'Payment ID is missing' });
    }

    // Fetch payment details from QuickPay
    const paymentDetails = await fetchPaymentDetailsFromQuickPay(paymentId);

    // Update the order in Firestore
    const orderId = paymentDetails.order_id;
    const orderRef = db.collection('orders').doc(orderId);
    await orderRef.update({
      status: paymentDetails.accepted ? 'paid' : 'failed',
      paymentDetails: paymentDetails,
      updatedAt: new Date(),
    });

    res.status(200).json({ message: 'Order updated successfully' });
  } catch (error) {
    console.error('Error in quickpayCallback:', error.response?.data || error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

// Helper function to fetch payment details
async function fetchPaymentDetailsFromQuickPay(paymentId) {
  const response = await axios.get(`https://api.quickpay.net/payments/${paymentId}`, {
    headers: {
      'Accept-Version': 'v10',
      Authorization: `Basic ${Buffer.from(`:${process.env.QUICKPAY_API_KEY}`).toString(
        'base64'
      )}`,
    },
  });
  return response.data;
}
