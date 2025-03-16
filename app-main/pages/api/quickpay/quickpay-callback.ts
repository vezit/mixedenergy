// pages/api/quickpay/quickpay-callback.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import getRawBody from 'raw-body'
import crypto from 'crypto'
import { supabaseAdmin } from '../../../lib/api/supabaseAdmin'
import { syncOrderToWoo } from '../../../lib/api/woocommerce/sync'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function quickpayCallbackHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const privateKey = process.env.QUICKPAY_CALLBACK_KEY || ''
    const checksumHeader = req.headers['quickpay-checksum-sha256']
    if (!checksumHeader || typeof checksumHeader !== 'string') {
      return res.status(401).json({ error: 'Missing quickpay-checksum-sha256 header' })
    }

    const rawBuf = await getRawBody(req)
    const rawBody = rawBuf.toString('utf8')

    // Verify HMAC signature
    const computedHmac = crypto
      .createHmac('sha256', privateKey)
      .update(rawBody)
      .digest('hex')

    if (computedHmac !== checksumHeader) {
      console.error('QuickPay callback signature mismatch!', {
        expected: computedHmac,
        received: checksumHeader,
      })
      return res.status(401).json({ error: 'Invalid signature' })
    }

    const payload = JSON.parse(rawBody)
    console.log('QuickPay callback data:', payload)

    // If the payment is accepted => store order in Supabase (if not already) and then sync
    if (payload.accepted) {
      console.log(`Payment #${payload.id} is accepted!`)

      // 1) QuickPay "order_id" is your "session_id"
      const sessionId = payload.order_id
      if (!sessionId) {
        console.error('No session_id (order_id) found in QuickPay payload!')
        return res.status(200).json({ message: 'Missing session_id in callback' })
      }

      // 2) Find or upsert into "orders" to reflect that it’s now paid
      //    For example, if you already inserted an order row earlier,
      //    you could just update the status to "paid". Otherwise, insert anew.
      const { data: existingOrder, error: existingOrderError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle()

      if (existingOrderError) {
        console.error('[Supabase] Error finding order:', existingOrderError)
        return res.status(200).json({ message: 'Supabase error checking order' })
      }

      let finalOrder
      if (existingOrder) {
        // Mark as paid + store quickpay details
        const { data: updated, error: updateErr } = await supabaseAdmin
          .from('orders')
          .update({
            status: 'paid',
            quickpay_details: payload,
            order_id: String(payload.id),
          })
          .eq('id', existingOrder.id)
          .single()
        if (updateErr || !updated) {
          console.error('[Supabase] Error updating existing order:', updateErr)
          return res.status(200).json({ message: 'Error updating order' })
        }
        finalOrder = updated
      } else {
        // Insert a new row if none exists
        // (But typically you'd already have an order row in `orders`.)
        const { data: inserted, error: insertErr } = await supabaseAdmin
          .from('orders')
          .insert([
            {
              order_key: sessionId,
              session_id: sessionId,
              order_id: String(payload.id),
              basket_details: {},      // Or fetch from session table if you do that
              quickpay_details: payload,
              status: 'paid',
            },
          ])
          .single()
        if (insertErr || !inserted) {
          console.error('[Supabase] Error inserting new order:', insertErr)
          return res.status(200).json({ message: 'Error inserting new order' })
        }
        finalOrder = inserted
      }

      // 3) Now sync this final order to WooCommerce
      try {
        await syncOrderToWoo(finalOrder)
      } catch (wooErr) {
        console.error('[WooCommerce] Sync failed:', wooErr)
      }
    } else {
      console.log(`Payment #${payload.id} is not accepted. State: ${payload.state}`)
    }

    // Return success response to QuickPay
    return res.status(200).json({ message: 'Callback received successfully' })
  } catch (err: any) {
    console.error('Error in QuickPay callback handler:', err)
    return res.status(500).json({ error: 'Server error handling callback' })
  }
}
