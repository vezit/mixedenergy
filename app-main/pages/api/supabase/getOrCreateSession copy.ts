// /pages/api/supabase/getOrCreateSession.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { serialize } from 'cookie'
import { v4 as uuidv4 } from 'uuid'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { filterData } from '../../../lib/filterData'
import { getCallerInfo } from '../../../lib/callerInfo'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    // Log caller information.
    const callerInfo = getCallerInfo(req);
    console.log('1-deleteSession called by:', callerInfo.referer);


    console.log('req.headers.cookie:', req.headers.cookie)

    // We'll ignore any existing sessionId in req.body; 
    // we'll rely on the cookie if it exists, or create a new one.
    const cookies = req.headers.cookie || ''
    const hasCookie = cookies.includes('session_id=')

    let sessionId: string | undefined

    if (!hasCookie) {
      // Generate a new session ID
      sessionId = uuidv4().slice(0, 30)

      // Set HTTP-only cookie
      res.setHeader(
        'Set-Cookie',
        serialize('session_id', sessionId, {
          httpOnly: false,
          maxAge: 365 * 24 * 60 * 60, // 1 year
          path: '/',
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
        })
      )
    } else {
      // If the cookie is there, extract it manually
      // (In practice, you could parse or let Supabase parse it,
      // but let's do a quick parse:)
      const matches = cookies.match(/session_id=([^;]+)/)
      if (matches?.[1]) {
        sessionId = matches[1]
      }
    }

    // If we never got a sessionId, that's weird. 
    // Possibly cookie is missing or invalid. Create new anyway.
    if (!sessionId) {
      sessionId = uuidv4().slice(0, 30)
      res.setHeader(
        'Set-Cookie',
        serialize('session_id', sessionId, {
          httpOnly: false,
          maxAge: 365 * 24 * 60 * 60,
          path: '/',
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
        })
      )
    }

    // Now check if there's a row in the sessions table
    const { data: existingSession } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle()

    // If no session row, create one
    if (!existingSession) {
      const newSession = {
        session_id: sessionId,
        allow_cookies: false,
        basket_details: {
          items: [],
          customerDetails: {
            customerType: null,
            fullName: null,
            mobileNumber: null,
            email: null,
            address: null,
            postalCode: null,
            city: null,
            country: 'Danmark',
          },
          paymentDetails: {},
          deliveryDetails: {},
        },
      }
      await supabaseAdmin.from('sessions').insert([newSession])
    }

    // Re-fetch final session row
    const { data: sessionRow } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle()

    if (!sessionRow) {
      return res.status(500).json({ error: 'Session not found after creation' })
    }

    // Return the session row (with underscores removed, etc.)
    const filtered = filterData(sessionRow, Infinity)

    // Include session_id in JSON for the client to see
    return res.status(200).json({
      session: filtered,
      newlyCreated: !existingSession,
    })
  } catch (error) {
    console.error('Error in getOrCreateSession:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
