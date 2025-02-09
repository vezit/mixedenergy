// /pages/api/supabase/createOrder.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import cookie from 'cookie';
import { supabaseAdmin } from '../../../lib/api/supabaseAdmin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept POST
  if (req.method !== 'POST') {
    console.warn(`Method ${req.method} not allowed on /api/supabase/createOrder`);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // 1) Read sessionId from cookies
    //    If you store it under a different name (e.g. 'session_id'), adjust accordingly.
    const { sessionId } = cookie.parse(req.headers.cookie || '');
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID not found in cookies' });
    }

    // 2) Fetch the session row from Supabase
    //    We'll assume your 'sessions' table has a JSON column "basket_details"
    const { data: sessionRow, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('session_id, basket_details')
      .eq('session_id', sessionId)
      .single();

    if (sessionError) {
      console.error('Error fetching session:', sessionError);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    if (!sessionRow) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const basketDetails = sessionRow.basket_details;
    if (!basketDetails || !basketDetails.items || basketDetails.items.length === 0) {
      return res.status(400).json({ message: 'Basket is empty' });
    }

    // 3) Generate a new orderId (UUID)
    const orderId = uuidv4();

    // 4) Calculate the total cost
    let totalPrice = 0;
    let totalRecyclingFee = 0;
    const deliveryFee = basketDetails.deliveryDetails?.deliveryFee || 0;

    basketDetails.items.forEach((item: any) => {
      totalPrice += item.totalPrice;
      totalRecyclingFee += item.totalRecyclingFee;
    });

    const totalAmount = totalPrice + totalRecyclingFee + deliveryFee; // in "cents" for QuickPay

    // 5) Create an order row in the "orders" table
    //    Adjust columns to match your schema, e.g. "id", "order_id", or whichever naming you use.
    const orderData = {
      id: orderId,                 // or store this in a separate "order_id" column
      session_id: sessionId,
      basket_details: basketDetails,
      order_details: {
        status: 'pending',
      },
      total_amount: totalAmount,   // store total in cents if you prefer
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabaseAdmin
      .from('orders')
      .insert([orderData]);

    if (insertError) {
      console.error('Error creating order row:', insertError);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    // 6) Create Payment with QuickPay
    //    Step A: Create Payment
    const authString = Buffer.from(`:${process.env.QUICKPAY_API_KEY}`).toString('base64');
    const createPaymentResponse = await axios.post(
      'https://api.quickpay.net/payments',
      new URLSearchParams({
        currency: 'DKK',
        order_id: orderId, // must be unique
      }),
      {
        headers: {
          'Accept-Version': 'v10',
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const paymentData = createPaymentResponse.data;

    // 7) Step B: Create Payment Link
    //    totalAmount is in "cents", e.g. 3200 => 32.00 DKK
    const paymentLinkResponse = await axios.put(
      `https://api.quickpay.net/payments/${paymentData.id}/link`,
      new URLSearchParams({
        amount: totalAmount.toString(),
      }),
      {
        headers: {
          'Accept-Version': 'v10',
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const paymentLinkData = paymentLinkResponse.data;
    const paymentLink = paymentLinkData.url;

    // 8) Update the order row with QuickPay details + link
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        quickpay_details: paymentData, // store the initial payment data
        payment_link: paymentLink,     // store the payment link
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order with QuickPay details:', updateError);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    // 9) Return the payment link to the client
    return res.status(200).json({ paymentLink });
  } catch (error: any) {
    console.error('Error in createOrder:', error.response?.data || error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
