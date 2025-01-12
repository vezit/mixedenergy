// /pages/api/supabase/quickpayCallback.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // 1) Parse Payment ID from body or query
    const paymentId = (req.body?.id as string) || (req.query?.id as string);
    if (!paymentId) {
      return res.status(400).json({ message: 'Payment ID is missing' });
    }

    // 2) Fetch payment details from QuickPay
    const paymentDetails = await fetchPaymentDetailsFromQuickPay(paymentId);
    const orderId = paymentDetails.order_id; // e.g., the same 'order_id' you passed to QuickPay

    // 3) Update the order in Supabase "orders" table
    //    We'll assume your table has a column "id" or "order_id" that matches QuickPay's "order_id".
    //    Adjust .eq('id', orderId) or .eq('order_id', orderId) to your actual column name.
    const { error } = await supabaseAdmin
      .from('orders')
      .update({
        // Mark it "paid" if paymentDetails.accepted == true, else "failed"
        order_details: {
          status: paymentDetails.accepted ? 'paid' : 'failed',
        },
        // Optionally store full QuickPay data in a "quickpay_details" column
        quickpay_details: paymentDetails,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId); // Or .eq('order_id', orderId)

    if (error) {
      console.error('Error updating order:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    return res.status(200).json({ message: 'Order updated successfully' });
  } catch (error: any) {
    console.error('Error in quickpayCallback:', error.response?.data || error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

// Helper function to fetch payment details from QuickPay
async function fetchPaymentDetailsFromQuickPay(paymentId: string) {
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
