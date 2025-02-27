import type { NextApiRequest, NextApiResponse } from 'next'
import getRawBody from 'raw-body'
import crypto from 'crypto'
import { supabaseAdmin } from '../../../lib/api/supabaseAdmin';

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

    // If the payment is accepted => copy session -> orders
    if (payload.accepted) {
      console.log(`Payment #${payload.id} is accepted!`)

      // 1) According to your note, the QuickPay "order_id" is your "session_id"
      const sessionId = payload.order_id
      if (!sessionId) {
        console.error('No session_id (order_id) found in QuickPay payload!')
        return res.status(200).json({ message: 'Missing session_id in callback' })
      }

      // 2) Fetch that session from your "sessions" table
      const { data: sessionRow, error: sessionError } = await supabaseAdmin
        .from('sessions')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle()

      if (sessionError || !sessionRow) {
        console.error('Could not find session for session_id:', sessionId, sessionError)
        return res.status(200).json({ message: 'Session not found' })
      }

      // 3) Insert into "orders" using data from the session
      //    Choose what you want to store for "order_id".
      //    Often, you might use the QuickPay "id" or keep the same sessionId.
      const { data: newOrder, error: newOrderError } = await supabaseAdmin
        .from('orders')
        .insert([
          {
            order_key: sessionRow.session_id,

            session_id: sessionRow.session_id,

            // Let's store QuickPay's numeric "id" as our "order_id" in orders
            order_id: String(payload.id),

            // Copy session's basket_details
            basket_details: sessionRow.basket_details,

            // Optionally store the entire QuickPay payload for reference
            quickpay_details: payload,

            // Mark as paid
            status: 'paid',
          },
        ])
        .single<{ id: string }>()

      if (newOrderError) {
        console.error('Error inserting into orders:', newOrderError)
        return res.status(200).json({ message: 'Error copying session into order' })
      }

      console.log('New order inserted with DB ID')

      // (Optional) Update the "sessions" table to store that final order_id
      // await supabaseAdmin
      //   .from('sessions')
      //   .update({ order_id: String(payload.id) })
      //   .eq('session_id', sessionId)

      // Additional post-payment steps: send email, etc.
    } else {
      // Handle other states
      console.log(`Payment #${payload.id} state is: ${payload.state}`)
    }

    // Return success response to QuickPay
    return res.status(200).json({ message: 'Callback received successfully' })
  } catch (err: any) {
    console.error('Error in QuickPay callback handler:', err)
    return res.status(500).json({ error: 'Server error handling callback' })
  }
}
