// File: pages/api/quickpay/getPaymentLink/[paymentId].ts

import type { NextApiRequest, NextApiResponse } from 'next';
import FormData from 'form-data';
import axios from 'axios';
import { parse } from 'cookie';
import { getBasket } from '../../../../lib/api/session/session'; // <-- Import your session helper

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { paymentId } = req.query;
  const QUICKPAY_API_KEY = process.env.QUICKPAY_API_KEY || '';
  const PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com';

  // Validate paymentId
  if (!paymentId || typeof paymentId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid paymentId in query' });
  }

  try {
    // 1) Get session_id from cookies
    const cookies = parse(req.headers.cookie || '');
    const sessionId = cookies['session_id'];
    if (!sessionId) {
      return res
        .status(400)
        .json({ error: 'No session_id cookie found. Please ensure you have a session.' });
    }

    // 2) Get basket from your "sessions" table
    const basketDetails = await getBasket(sessionId);
    if (!basketDetails) {
      return res.status(404).json({ error: 'No basket found for this session' });
    }

    // 3) Calculate final total in øre:
    //    sum of each item's totalPrice plus deliveryFee (if any).
    const items = basketDetails.items || [];
    let totalItemPrice = 0;
    for (const item of items) {
      totalItemPrice += (item as any).totalPrice || 0;
    }
    const deliveryFee = basketDetails?.deliveryDetails?.deliveryFee || 0;
    const finalAmount = totalItemPrice + deliveryFee; // in øre

    // 4) Prepare form-data with the final amount & callback URLs
    const formData = new FormData();
    formData.append('amount', String(finalAmount));
    formData.append('continue_url', `${PUBLIC_BASE_URL}/payment-success`);
    formData.append('cancel_url', `${PUBLIC_BASE_URL}/basket`);
    formData.append('callback_url', `${PUBLIC_BASE_URL}/api/quickpay/quickpay-callback`);

    // 5) Make request to QuickPay’s /payments/{id}/link endpoint
    const base64Auth = Buffer.from(`:${QUICKPAY_API_KEY}`).toString('base64');
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

    // QuickPay’s /link response typically has: { url: "https://payment.quickpay.net/payments/..." }
    const data = response.data;

    

    // 6) Return the link so the frontend can redirect user to pay
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
