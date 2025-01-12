// /pages/api/supabase/1-acceptCookies.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    // read sessionId from body
    const { sessionId } = req.body
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId in POST body.' })
    }

    // see if we have a session row
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

    // update
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        allow_cookies: true,
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)

    if (updateError) {
      console.error('Error updating session:', updateError)
      return res.status(500).json({ error: 'Internal server error' })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in acceptCookies handler:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
