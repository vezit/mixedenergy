import type { NextApiRequest, NextApiResponse } from 'next';
import { parse, serialize } from 'cookie';
import {
  getOrCreateSession,
  deleteSession,
  acceptCookies,
  getBasket,
  updateSession,
} from '../../../lib/api/session/session';

// NEW imports from your libraries:
import { createTemporarySelection } from '../../../lib/api/session/createTemporarySelection';
import { getCalculatedPackagePrice } from '../../../lib/api/session/getCalculatedPackagePrice';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('[session.ts] API handler called. Method:', req.method);

    if (req.method === 'GET') {
      console.log('[session.ts] GET => calling getOrCreateSession');
      const noBasket = req.query.noBasket === '1';
      const cookieHeader = req.headers.cookie || '';
      const { newlyCreated, session, sessionId } = await getOrCreateSession(cookieHeader, noBasket);

      // If newly created, set a "session_id" cookie
      if (newlyCreated) {
        console.log('[session.ts] Setting session_id cookie for new session:', sessionId);
        res.setHeader(
          'Set-Cookie',
          serialize('session_id', sessionId, {
            httpOnly: false,
            maxAge: 365 * 24 * 60 * 60, // 1 year
            path: '/',
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production',
          })
        );
      }
      return res.status(200).json({ newlyCreated, session });
    }

    else if (req.method === 'POST') {
      console.log('[session.ts] POST => body:', req.body);
      // Parse sessionId from cookies or body
      const cookiesHeader = req.headers.cookie || '';
      const parsedCookies = parse(cookiesHeader);
      const sessionId = parsedCookies['session_id'] || req.body.sessionId;

      const { action, ...rest } = req.body;
      if (!action) {
        return res.status(400).json({ error: 'Missing action in request body' });
      }

      console.log('[session.ts] action =', action);
      console.log('[session.ts] sessionId (from cookie or body) =', sessionId);

      // 1) DELETE SESSION
      if (action === 'deleteSession') {
        if (!sessionId) {
          return res.status(400).json({ error: 'No session ID provided' });
        }
        await deleteSession(sessionId);
        return res.status(200).json({ success: true, message: 'Session deleted successfully' });
      }

      // 2) ACCEPT COOKIES
      else if (action === 'acceptCookies') {
        if (!sessionId) {
          return res.status(400).json({ error: 'No session ID provided' });
        }
        const result = await acceptCookies(sessionId);
        return res.status(200).json(result);
      }

      // 3) GET BASKET
      else if (action === 'getBasket') {
        if (!sessionId) {
          return res.status(400).json({ error: 'No session ID provided' });
        }
        const basket = await getBasket(sessionId);
        return res.status(200).json({ success: true, basket });
      }

      // 4) BASKET ACTIONS (addItem, removeItem, etc.)
      else if (['addItem', 'removeItem', 'updateQuantity', 'updateCustomerDetails', 'updateDeliveryDetails'].includes(action)) {
        if (!sessionId) {
          return res.status(400).json({ error: 'No session ID provided' });
        }
        const updateResult = await updateSession({
          action,
          sessionId,
          data: rest,
        });
        return res.status(200).json(updateResult);
      }

      // 5) NEW: CREATE TEMPORARY SELECTION
      else if (action === 'createTemporarySelection') {
        const result = await createTemporarySelection({
          sessionId,
          ...rest,
        });
        return res.status(200).json(result);
      }

      // 6) NEW: GET CALCULATED PACKAGE PRICE
      else if (action === 'getCalculatedPackagePrice') {
        const result = await getCalculatedPackagePrice(rest);
        return res.status(200).json(result);
      }

      // 7) UNKNOWN ACTION
      else {
        return res.status(400).json({ error: 'Invalid action' });
      }
    }

    // If neither GET nor POST
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err: any) {
    console.error('[session.ts] catch error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
