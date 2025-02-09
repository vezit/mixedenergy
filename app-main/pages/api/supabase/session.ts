// pages/api/supabase/session.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { parse, serialize } from 'cookie';
import {
  getOrCreateSession,
  deleteSession,
  acceptCookies,
  getBasket,
  updateSession, // <-- Use updateSession instead of updateBasket
} from '../../../lib/api/session/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      // GET => get or create session
      const noBasket = req.query.noBasket === '1';
      const cookieHeader = req.headers.cookie || '';

      const { newlyCreated, session, sessionId } = await getOrCreateSession(cookieHeader, noBasket);

      // If newly created, set a "session_id" cookie
      if (newlyCreated) {
        res.setHeader('Set-Cookie', serialize('session_id', sessionId, {
          httpOnly: false,
          maxAge: 365 * 24 * 60 * 60, // e.g. 1 year
          path: '/',
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
        }));
      }

      return res.status(200).json({ newlyCreated, session });
    }

    else if (req.method === 'POST') {
      const cookiesHeader = req.headers.cookie || '';
      const parsedCookies = parse(cookiesHeader);
      const sessionId = parsedCookies['session_id'] || req.body.sessionId;

      if (!sessionId) {
        return res.status(400).json({ error: 'No session ID provided' });
      }

      const { action } = req.body;
      if (!action) {
        return res.status(400).json({ error: 'Missing action in request body' });
      }

      // ACTION: deleteSession
      if (action === 'deleteSession') {
        await deleteSession(sessionId);
        return res.status(200).json({ success: true, message: 'Session deleted successfully' });
      }

      // ACTION: acceptCookies
      else if (action === 'acceptCookies') {
        const result = await acceptCookies(sessionId);
        return res.status(200).json(result);
      }

      // ACTION: getBasket
      else if (action === 'getBasket') {
        const basket = await getBasket(sessionId);
        return res.status(200).json({ success: true, basket });
      }

      // ACTION: addItem, removeItem, updateQuantity, updateCustomerDetails
      else if (['addItem','removeItem','updateQuantity','updateCustomerDetails'].includes(action)) {
        // Use updateSession instead of updateBasket
        const updateResult = await updateSession(sessionId, action, req.body);
        return res.status(200).json(updateResult);
      }

      // ACTION: unknown
      else {
        return res.status(400).json({ error: 'Invalid action' });
      }
    }

    // If neither GET nor POST => 405
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err: any) {
    console.error('[session] catch error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
