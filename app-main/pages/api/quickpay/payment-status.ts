// File: pages/api/quickpay/payment-status.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/api/supabaseAdmin';

/**
 * GET /api/quickpay/payment-status?orderId=...
 *
 * Query param: orderId = the "session_id" or "order_id" you passed in continue_url.
 * Response JSON:
 *   {
 *     accepted: boolean,
 *     order?: { ...the orders row... }
 *     error?: string
 *   }
 */
export default async function paymentStatusHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { orderId } = req.query;
    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid orderId' });
    }

    // 1) Look up the order in your DB
    //    - If your "continue_url" uses `session_id` in the ?orderId,
    //      then we find by .eq('session_id', orderId).
    //    - If you used QuickPay’s numeric "id", eq('order_id', orderId).
    const { data: orderRow, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('session_id', orderId) // or .eq('order_id', orderId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching order from DB:', error);
      return res.status(500).json({ error: 'DB error fetching order' });
    }
    if (!orderRow) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // 2) Check if the order is paid
    //    - Suppose your code sets orders.status = 'paid' when QuickPay callback is accepted
    const isPaid = orderRow.status === 'paid' || orderRow.status === 'paid_and_captured';

    return res.status(200).json({
      accepted: isPaid,
      order: orderRow,
    });
  } catch (err: any) {
    console.error('Error in payment-status handler:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
}
