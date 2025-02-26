// File: pages/api/test/getPaymentLink/[paymentId].ts

import type { NextApiRequest, NextApiResponse } from 'next';
import FormData from 'form-data';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET for this route
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { paymentId } = req.query;
  const QUICKPAY_API_KEY = process.env.QUICKPAY_API_KEY || '';
  const PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com';

  if (!paymentId || typeof paymentId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid paymentId in query' });
  }

  try {
    // Prepare form-data with the amount and callback URL
    const formData = new FormData();
    const base64Auth = Buffer.from(`:${QUICKPAY_API_KEY}`).toString('base64');

    formData.append('amount', '4200'); // 42.00 DKK in øre
    // Optionally add a "continue_url" (where to go after a successful payment)
    formData.append('continue_url', `${PUBLIC_BASE_URL}/payment-success`);
    // Optionally add a "cancel_url" (where to go if user cancels)
    formData.append('cancel_url', `${PUBLIC_BASE_URL}/basket`);
    // IMPORTANT: The asynchronous callback URL:
    formData.append('callback_url', `${PUBLIC_BASE_URL}/api/test/quickpay-callback`);

    const response = await axios.put(
      `https://api.quickpay.net/payments/${paymentId}/link`,
      formData,
      {
        headers: {
          'Accept-Version': 'v10',
          Authorization: `Basic ${base64Auth}`,
          ...formData.getHeaders(),
        },
      }
    );

    // QuickPay’s /link response: typically { url: "https://payment.quickpay.net/payments/..." }
    const data = response.data;

    // Return the link so your frontend can redirect user to pay
    return res.status(200).json({
      linkUrl: data.url || null,
      quickpayResponse: data, // optional, for debugging
    });
  } catch (error: any) {
    console.error(
      'Error creating/getting payment link from QuickPay:',
      error?.response?.data || error.message
    );
    return res.status(500).json({
      error: 'Failed to get payment link',
      details: error?.response?.data || error.message,
    });
  }
}
