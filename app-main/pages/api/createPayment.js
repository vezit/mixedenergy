// pages/api/createPayment.js

import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.warn(`Method ${req.method} not allowed on /api/createPayment`);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { orderId } = req.body;

  try {
    const formDataCreatePayment = new URLSearchParams();
    formDataCreatePayment.append('currency', 'DKK');
    formDataCreatePayment.append('order_id', orderId);
    
    const response = await fetch('https://api.quickpay.net/payments', {
      method: 'POST',
      headers: {
        'Accept-Version': 'v10',
        'Authorization': `Basic ${Buffer.from(`:${process.env.QUICKPAY_API_KEY}`).toString('base64')}`,
      },
      body: formDataCreatePayment,
    });

    const paymentData = await response.json();

    if (!response.ok) {
      console.error('Error creating payment:', paymentData);
      return res.status(500).json({ message: 'Error creating payment' });
    }

    // Optionally, update the order with payment ID
    // await db.collection('orders').doc(orderId).update({
    //   paymentId: paymentData.id,
    // });

    // Create a payment link
    const formDataPaymentLink = new URLSearchParams();
    formDataPaymentLink.append('amount', calculateTotalAmount()); // Implement this function to calculate the total amount in cents
    formDataPaymentLink.append('continue_url', 'https://www.mixedenergy.dk/payment-success');
    formDataPaymentLink.append('cancel_url', 'https://www.mixedenergy.dk/payment-cancel');
    formDataPaymentLink.append('callback_url', 'https://www.mixedenergy.dk/api/quickpayCallback');
    
    const linkResponse = await fetch(`https://api.quickpay.net/payments/${paymentData.id}/link`, {
      method: 'PUT',
      headers: {
        'Accept-Version': 'v10',
        'Authorization': `Basic ${Buffer.from(`:${process.env.QUICKPAY_API_KEY}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formDataPaymentLink.toString(),
    });

    const linkData = await linkResponse.json();

    if (!linkResponse.ok) {
      console.error('Error creating payment link:', linkData);
      return res.status(500).json({ message: 'Error creating payment link' });
    }

    res.status(200).json(linkData);
  } catch (error) {
    console.error('Error in createPayment:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

// Helper function to calculate total amount
function calculateTotalAmount() {
  // Implement logic to calculate total amount in cents (øre)
  // For example, sum up the prices of items in the order
  return 5000; // Replace with actual amount
}
