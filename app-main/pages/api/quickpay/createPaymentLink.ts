// /pages/api/quickpay/createPaymentLink.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

const QUICKPAY_API_KEY = process.env.QUICKPAY_API_KEY || ''; 
const QUICKPAY_PRIVATE_KEY = process.env.QUICKPAY_PRIVATE_KEY || '';
const QUICKPAY_BASE_URL = 'https://api.quickpay.net'; 

/**
 * Example endpoint to create a payment and generate a payment link via QuickPay.
 * Expects JSON body containing e.g.: { orderId: string, amount: number (øre), currency: 'DKK', ... } 
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // 1) Extract order-related data from request body
    const { orderId, amount, currency, customerDetails, items } = req.body;

    // Basic validation
    if (!orderId || !amount || !currency) {
      return res.status(400).json({ error: 'Missing fields in request body.' });
    }

    // 2) Create Payment in QuickPay
    // Each payment requires a unique order_id
    // We'll do a POST /payments with the minimal fields first
    const createPaymentResponse = await fetch(`${QUICKPAY_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        // Basic Auth with your QuickPay API Key
        // Note: The API key must be base64 encoded `user:password` but QuickPay uses an empty user with the API Key as password
        'Authorization': 'Basic ' + Buffer.from(':' + QUICKPAY_API_KEY).toString('base64')
      },
      body: JSON.stringify({
        order_id: orderId,
        currency,
        // optionally you can pass additional fields:
        // text_on_statement: 'MyShop Example', 
        // invoice_address: { ... },
        // shipping_address: { ... },
        // basket: [ { qty, item_no, item_name, price } ]
      }),
    });

    if (!createPaymentResponse.ok) {
      const errorBody = await createPaymentResponse.json();
      throw new Error('Failed to create QuickPay payment: ' + JSON.stringify(errorBody));
    }

    const payment = await createPaymentResponse.json();
    const paymentId = payment.id;

    // 3) Create a Payment Link 
    // PUT /payments/{id}/link with e.g.: { amount, continue_url, cancel_url, callback_url }
    const linkUrl = `${QUICKPAY_BASE_URL}/payments/${paymentId}/link`;

    const linkResponse = await fetch(linkUrl, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(':' + QUICKPAY_API_KEY).toString('base64')
      },
      body: JSON.stringify({
        amount, // in øre
        continue_url: 'https://vicre-nextjs-app01.ngrok.app/payment-success',
        cancel_url: 'https://vicre-nextjs-app01.ngrok.app/basket',
        callback_url: 'https://vicre-nextjs-app01.ngrok.app/api/quickpay/callback',
        auto_capture: true, 
        customer_email: customerDetails?.email || '',
        // Optionally specify payment_methods to limit which methods are shown
        // payment_methods: ['creditcard', 'dankort', 'mobilepay'],
        // language: 'da', // to localize the payment window
      }),
    });

    if (!linkResponse.ok) {
      const errorBody = await linkResponse.json();
      throw new Error('Failed to create QuickPay payment link: ' + JSON.stringify(errorBody));
    }

    const linkJson = await linkResponse.json();
    const paymentLink = linkJson.url;

    // 4) Return the link to the client
    return res.status(200).json({ paymentLink, paymentId });
  } catch (err) {
    console.error('Error in QuickPay createPaymentLink:', err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
