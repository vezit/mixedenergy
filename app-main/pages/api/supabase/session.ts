// pages/api/supabase/session.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { parse, serialize } from 'cookie';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../../../lib/api/supabaseAdmin';

// Optional simple filter
function filterData(obj: any) {
  return obj; // or do deeper transformations
}

interface SessionRow {
  session_id: string;
  basket_details?: any;
  allow_cookies?: boolean;
  // etc.
}

/**
 * A single GET endpoint that:
 *  - Checks the `session_id` cookie
 *  - If missing, creates one, inserts row in 'sessions'
 *  - Returns the final row (including basket_details)
 *  - If you want to omit basket_details, use ?noBasket=1
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const noBasket = req.query.noBasket === '1';

    // 1) Parse or create session_id
    const cookiesHeader = req.headers.cookie || '';
    const parsedCookies = parse(cookiesHeader);
    let sessionId = parsedCookies.session_id;

    if (!sessionId) {
      // create new session_id
      sessionId = uuidv4().slice(0, 30); 
      // set cookie
      res.setHeader(
        'Set-Cookie',
        serialize('session_id', sessionId, {
          httpOnly: false, 
          maxAge: 365 * 24 * 60 * 60,
          path: '/',
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
        })
      );
    }

    // 2) Find session row
    const { data: existingSession, error: selectErr } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle<SessionRow>();

    if (selectErr) {
      console.error('[session] select error:', selectErr);
      return res.status(500).json({ error: 'Internal server error' });
    }

    let newlyCreated = false;
    if (!existingSession) {
      newlyCreated = true;
      // create row
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
      };
      const { error: insertErr } = await supabaseAdmin
        .from('sessions')
        .insert([newSession]);
      if (insertErr) {
        console.error('[session] insert error:', insertErr);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    // 3) Re-fetch or reuse session
    let finalSession: SessionRow | null = null;
    if (newlyCreated) {
      const { data, error } = await supabaseAdmin
        .from('sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single<SessionRow>();
      if (error || !data) {
        console.error('[session] refetch error:', error);
        return res.status(500).json({ error: 'Session not found after creation' });
      }
      finalSession = data;
    } else {
      finalSession = existingSession;
    }

    // 4) Omit basket_details if ?noBasket=1
    let output = { ...finalSession };
    if (noBasket && output?.basket_details) {
      delete output.basket_details;
    }

    // optional transform
    const filtered = filterData(output);

    return res.status(200).json({
      newlyCreated,
      session: filtered,
    });
  } catch (err: any) {
    console.error('[session] catch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
