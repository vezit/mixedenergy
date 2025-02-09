// /pages/api/supabase/1-acceptCookies.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/api/supabaseAdmin'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Allow only POST requests.
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    // Read sessionId from the request body.
    const { sessionId } = req.body
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId in POST body.' })
    }

    // Optionally, check if the session row exists.
    const { data: existingSession, error: selectError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (selectError) {
      console.error('Error checking session:', selectError)
      return res.status(500).json({ error: 'Internal server error' })
    }
    if (!existingSession) {
      return res.status(404).json({ error: 'Session not found' })
    }

    // Call the stored procedure "accept_cookies" via RPC.
    // This function will update allow_cookies to true and set updated_at using Danish time.
    const { error: rpcError } = await supabaseAdmin.rpc('accept_cookies', {
      session_id_param: sessionId,
    })

    if (rpcError) {
      console.error('Error updating session via RPC:', rpcError)
      return res.status(500).json({ error: 'Internal server error' })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in acceptCookies handler:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
