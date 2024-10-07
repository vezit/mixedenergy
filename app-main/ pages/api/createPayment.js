// pages/api/createPayment.js

import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { orderId, currency = 'DKK' } = req.body;

  const response = await fetch('https://api.quickpay.net/payments', {
    method: 'POST',
    headers: {
      'Accept-Version': 'v10',
      'Authorization': `Basic ${process.env.QUICKPAY_API_KEY_BASE64}`,
    },
    body: JSON.stringify({
      currency,
      order_id: orderId,
    }),
  });

  const paymentData = await response.json();

  if (response.ok) {
    res.status(200).json(paymentData);
  } else {
    console.error('Error creating payment:', paymentData);
    res.status(500).json({ message: 'Error creating payment' });
  }
}
