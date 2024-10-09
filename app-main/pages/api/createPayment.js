// pages/api/createPayment.js

import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.warn(`Method ${req.method} not allowed on /api/createPayment`);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { orderId, totalPrice } = req.body;

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

    // Create a payment link
    const formDataPaymentLink = new URLSearchParams();
    formDataPaymentLink.append('amount', totalPrice); // Use the totalPrice from the request body
    formDataPaymentLink.append('continue_url', 'https://www.mixedenergy.dk/payment-success?orderId=' + orderId);
    formDataPaymentLink.append('cancel_url', 'https://www.mixedenergy.dk/basket');
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