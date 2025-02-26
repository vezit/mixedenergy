// File: pages/api/quickpay/createPayment.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'cookie';
import FormData from 'form-data';
import axios from 'axios';



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1) Parse the session_id from the cookie
    const cookies = parse(req.headers.cookie || '');
    const sessionId = cookies['session_id'];
    const QUICKPAY_API_KEY = process.env.QUICKPAY_API_KEY || '';
    if (!sessionId) {
      return res
        .status(400)
        .json({ error: 'No session_id cookie found. Please ensure you have a session.' });
    }

    // 2) Prepare form-data for QuickPay
    const formData = new FormData();
    formData.append('currency', 'dkk');
    formData.append('order_id', sessionId); // Using sessionId as the order_id

    // 3) Call QuickPay POST /payments
    //    Make sure to replace <YOUR_BASE64_AUTH> with your actual Basic Auth credentials
    //    or set them via environment variables if you prefer.
    const base64 = Buffer.from(`:${QUICKPAY_API_KEY}`).toString('base64')
    const response = await axios.post('https://api.quickpay.net/payments', formData, {
      headers: {
        'Accept-Version': 'v10',
        Authorization: `Basic ${base64}`, // Basic Auth
        ...formData.getHeaders(), // required when using FormData in axios
      },
    });

    // 4) Return the new payment ID
    const payment = response.data;
    return res.status(200).json({
      paymentId: payment.id,
      quickpayResponse: payment, // Optional: return entire payload for debugging
    });
  } catch (error: any) {
    console.error('Error creating payment in QuickPay:', error?.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to create payment',
      details: error?.response?.data || error.message,
    });
  }
}
