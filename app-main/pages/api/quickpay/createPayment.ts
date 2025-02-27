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

  const cookies = parse(req.headers.cookie || '')
  const sessionId = cookies['session_id']
  const QUICKPAY_API_KEY = process.env.QUICKPAY_API_KEY || ''

  if (!sessionId) {
    return res
      .status(400)
      .json({ error: 'No session_id cookie found. Please ensure you have a session.' })
  }

  const base64 = Buffer.from(`:${QUICKPAY_API_KEY}`).toString('base64')

  try {
    // 1) Attempt to create a payment
    const formData = new FormData()
    formData.append('currency', 'dkk')
    formData.append('order_id', sessionId) // QuickPay "order_id" = sessionId

    const createPaymentRes = await axios.post('https://api.quickpay.net/payments', formData, {
      headers: {
        'Accept-Version': 'v10',
        Authorization: `Basic ${base64}`,
        ...formData.getHeaders(),
      },
    })

    // 2) Created new payment successfully
    const newPayment = createPaymentRes.data
    console.log('QuickPay payment created:', newPayment)

    // 3) Update sessions table with numeric QuickPay ID (or keep the same string)
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({ order_id: newPayment.id }) // or newPayment.order_id
      .eq('session_id', sessionId)
      .maybeSingle<SessionsTableRow>()

    if (updateError) {
      console.error('Error updating sessions.order_id:', updateError)
      // Optionally handle or ignore
    } else {
      console.log('Session updated with order_id:', updatedSession?.order_id)
    }

    // 4) Return payment info to client
    return res.status(200).json({
      paymentId: newPayment.id,
      orderId: newPayment.order_id,
      quickpayResponse: newPayment,
    })

  } catch (error: any) {
    // -------------------------------------------------------------------
    // 5) If "order_id already exists on another payment", fetch the existing payment
    // -------------------------------------------------------------------
    const quickPayError = error?.response?.data
    const isAlreadyExistsError =
      error?.response?.status === 400 &&
      quickPayError?.message?.includes('order_id already exists on another payment')

    if (isAlreadyExistsError) {
      console.warn(
        `[QuickPay] Payment creation failed because order_id=${sessionId} already exists. Retrieving existing payment...`
      )

      try {
        // 6) Find the existing payment(s) by order_id
        // GET /payments?order_id=<sessionId> returns an array of payments
        const getPaymentsRes = await axios.get(
          `https://api.quickpay.net/payments?order_id=${sessionId}`,
          {
            headers: {
              'Accept-Version': 'v10',
              Authorization: `Basic ${base64}`,
            },
          }
        )

        const existingPayments = getPaymentsRes.data
        if (!Array.isArray(existingPayments) || existingPayments.length === 0) {
          // If no payment found, respond accordingly
          return res.status(404).json({
            error: `No existing payment found for order_id=${sessionId}`,
          })
        }

        // 7) For simplicity, grab the first (or last) payment from the array
        // If you expect multiple, decide which one suits your needs.
        const existingPayment = existingPayments[0]
        console.log('Found existing payment:', existingPayment)

        // 8) Update sessions table with this existing payment’s numeric ID (or order_id)
        const { data: updatedSession, error: updateError } = await supabaseAdmin
          .from('sessions')
          .update({ order_id: existingPayment.id }) // or existingPayment.order_id
          .eq('session_id', sessionId)
          .maybeSingle<SessionsTableRow>()

        if (updateError) {
          console.error('Error updating sessions with existing payment:', updateError)
          // Optionally handle or ignore
        } else {
          console.log('Session updated with existing order_id:', updatedSession?.order_id)
        }

        // 9) Return the existing payment data to the client
        return res.status(200).json({
          paymentId: existingPayment.id,
          orderId: existingPayment.order_id,
          quickpayResponse: existingPayment,
          alreadyExisted: true,
        })
      } catch (fetchErr: any) {
        // If we fail to fetch the existing payment
        console.error('Error fetching existing payment:', fetchErr?.response?.data || fetchErr)
        return res.status(500).json({
          error: 'Failed to retrieve existing payment from QuickPay',
          details: fetchErr?.response?.data || fetchErr.message,
        })
      }
    }

    // -------------------------------------------------------------------
    // 10) Otherwise, it's some other error, just return as 500
    // -------------------------------------------------------------------
    console.error('Error creating payment in QuickPay:', quickPayError || error.message)
    return res.status(500).json({
      error: 'Failed to create payment',
      details: quickPayError || error.message,
    })
  }
}
