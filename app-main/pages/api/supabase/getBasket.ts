// pages/api/supabase/getBasket.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'cookie';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

interface SessionRow {
  session_id: string;
  basket_details?: any; // your basket shape
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Enforce GET only
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 1) Parse sessionId from cookie or "Bearer" header
    const cookiesHeader = req.headers.cookie;
    const parsedCookies = cookiesHeader ? parse(cookiesHeader) : {};
    let sessionId = parsedCookies['session_id'];

    // Optionally also support "Bearer <sessionId>" in Authorization header
    if (!sessionId && req.headers.authorization?.startsWith('Bearer ')) {
      sessionId = req.headers.authorization.split(' ')[1];
    }

    // If STILL no sessionId, fallback to query or body if you want:
    // let sessionId = req.query.sessionId || parsedCookies['session_id'] || req.body.sessionId;

    if (!sessionId) {
      return res.status(400).json({ error: 'No session ID provided (cookie or Authorization bearer)' });
    }

    // 2) Fetch the session row
    const { data: sessionRow, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('session_id, basket_details')
      .eq('session_id', sessionId)
      .single<SessionRow>();

    if (sessionError) {
      console.error('[getBasket] Session fetch error:', sessionError);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!sessionRow) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // 3) Extract basket_details
    const basketDetails = sessionRow.basket_details || {};

    // 4) Return
    return res.status(200).json({ basketDetails });
  } catch (error: any) {
    console.error('[getBasket] Catch Error:', error);
    return res.status(500).json({ error: 'Error fetching basket' });
  }
}
