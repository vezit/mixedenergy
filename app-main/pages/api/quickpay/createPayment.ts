// File: pages/api/quickpay/createPayment.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { parse } from 'cookie'
import FormData from 'form-data'
import axios from 'axios'
import { supabaseAdmin } from '../../../lib/api/supabaseAdmin'

// 1) Define a type for your sessions table row
interface SessionsTableRow {
  session_id: string
  order_id?: string | null
  // ...other columns from your "sessions" table
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const cookies = parse(req.headers.cookie || '')
    const sessionId = cookies['session_id']
    const QUICKPAY_API_KEY = process.env.QUICKPAY_API_KEY || ''

    if (!sessionId) {
      return res
        .status(400)
        .json({ error: 'No session_id cookie found. Please ensure you have a session.' })
    }

    const formData = new FormData()
    formData.append('currency', 'dkk')
    formData.append('order_id', sessionId) // QuickPay "order_id" = sessionId

    const base64 = Buffer.from(`:${QUICKPAY_API_KEY}`).toString('base64')
    const response = await axios.post('https://api.quickpay.net/payments', formData, {
      headers: {
        'Accept-Version': 'v10',
        Authorization: `Basic ${base64}`,
        ...formData.getHeaders(),
      },
    })

    const payment = response.data
    console.log('QuickPay payment created:', payment)

    // 2) Update sessions table, providing a type for the returned data
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({ order_id: payment.id })
      .eq('session_id', sessionId)
      .maybeSingle<SessionsTableRow>()

    if (updateError) {
      console.error('Error updating sessions.order_id:', updateError)
      // Decide if you want to return or continue
    } else {
      // Now TypeScript knows `updatedSession` has type `SessionsTableRow | null`
      console.log('Session updated with order_id:', updatedSession?.order_id)
    }

    return res.status(200).json({
      paymentId: payment.id,
      orderId: payment.order_id,
      quickpayResponse: payment,
    })
  } catch (error: any) {
    console.error('Error creating payment in QuickPay:', error?.response?.data || error.message)
    return res.status(500).json({
      error: 'Failed to create payment',
      details: error?.response?.data || error.message,
    })
  }
}
