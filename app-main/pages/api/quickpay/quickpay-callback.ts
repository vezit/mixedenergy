// File: pages/api/quickpay/quickpay-callback.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import getRawBody from 'raw-body'
import crypto from 'crypto'
import { supabaseAdmin } from '../../../lib/api/supabaseAdmin';

// Tell Next.js NOT to parse the body automatically
export const config = {
  api: {
    bodyParser: false,
  },
}

/**
 * QuickPay callback handler
 * We must HMAC the exact raw body using the "private key" from QuickPay account settings.
 */
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

    // 1) Read the raw body
    const rawBuf = await getRawBody(req)
    const rawBody = rawBuf.toString('utf8')

    // 2) Compute HMAC of the raw body with the private key
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

    // 3) At this point, the request is verified. Parse JSON if needed
    const payload = JSON.parse(rawBody)
    console.log('QuickPay callback data:', payload)

    // Example: If the payment is accepted
    if (payload.accepted) {
      console.log(`Payment #${payload.id} is accepted!`)
      // ... mark order as paid, send email, etc.

      // copy session into order

    } else {
      console.log(`Payment #${payload.id} state is: ${payload.state}`)
    }

    // 4) Tell QuickPay we got it
    return res.status(200).json({ message: 'Callback received successfully' })
  } catch (err: any) {
    console.error('Error in QuickPay callback handler:', err)
    return res.status(500).json({ error: 'Server error handling callback' })
  }
}
