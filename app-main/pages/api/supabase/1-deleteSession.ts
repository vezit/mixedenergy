// api/supabase/1-deleteSession.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/api/supabaseAdmin';
import { getCallerInfo } from '../../../lib/callerInfo';
// Import the parse function from the cookie package.
import { parse } from 'cookie';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Allow only POST or DELETE methods.
    if (req.method !== 'POST' && req.method !== 'DELETE') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Log caller information.
    const callerInfo = getCallerInfo(req);
    console.log('1-deleteSession called by:', callerInfo);

    // Parse cookies from the request header.
    const cookiesHeader = req.headers.cookie;
    const parsedCookies = cookiesHeader ? parse(cookiesHeader) : {};

    // Get the session ID from the cookie (fallback to the body if not found).
    const sessionId = parsedCookies['session_id'] || req.body.sessionId;

    if (!sessionId) {
      return res.status(400).json({ error: 'No session ID provided via cookie or body' });
    }

    // Delete the session from the Supabase "sessions" table.
    const { error } = await supabaseAdmin
      .from('sessions')
      .delete()
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error deleting session:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    return res.status(200).json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error in delete session handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
