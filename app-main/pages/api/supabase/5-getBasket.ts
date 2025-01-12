// /pages/api/supabase/getBasket.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import cookie from 'cookie';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Types for your row structure, adjust as needed
interface SessionRow {
  session_id: string;
  basket_details?: any; // If stored as JSON
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Only accept GET requests
    if (req.method !== 'GET') {
      return res.status(405).end(); // Method Not Allowed
    }

    // 1) Parse cookies
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionId = cookies.session_id;
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId in cookies' });
    }

    // 2) Fetch the session row from Supabase
    const { data: sessionRow, error } = await supabaseAdmin
      .from('sessions')
      .select('session_id, basket_details')
      .eq('session_id', sessionId)
      .single<SessionRow>();

    if (error) {
      console.error('Error fetching session row:', error);
      return res.status(500).json({ error: 'Error fetching basket' });
    }

    if (!sessionRow) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // 3) Extract basket_details
    const basketDetails = sessionRow.basket_details || {};

    // 4) Return
    return res.status(200).json({ basketDetails });
  } catch (error) {
    console.error('Error fetching basket:', error);
    return res.status(500).json({ error: 'Error fetching basket' });
  }
}
