// pages/api/supabase/session.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { parse, serialize } from 'cookie';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../../../lib/api/supabaseAdmin';
import { filterData } from '../../../lib/filterData'; // optional, from your snippet
import { getCallerInfo } from '../../../lib/callerInfo'; // optional, from your snippet

/**
 * This endpoint does BOTH "getOrCreateSession" AND "getBasket":
 * - If no cookie, create new session_id + insert row in `sessions`.
 * - Otherwise, fetch existing session row.
 * - If ?noBasket=1, strip basket_details from the returned data.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // We can accept either GET or POST (or both).
    // If you prefer only GET, do if(req.method!=='GET') ...
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Optional: log caller info
    const callerInfo = getCallerInfo(req);
    console.log('[session] Called by:', callerInfo);

    // 1) Check if we only want minimal data
    const noBasket = req.query.noBasket === '1'; // e.g. /api/supabase/session?noBasket=1

    // 2) Parse cookies for "session_id"
    const cookiesHeader = req.headers.cookie || '';
    const parsedCookies = parse(cookiesHeader);
    let sessionId = parsedCookies['session_id'];

    // If no cookie, create a new session_id
    if (!sessionId) {
      sessionId = uuidv4().slice(0, 30); // or full UUID, your call
      // Set it on the response
      res.setHeader(
        'Set-Cookie',
        serialize('session_id', sessionId, {
          httpOnly: false, // or true if you prefer
          maxAge: 365 * 24 * 60 * 60, // 1 year
          path: '/',
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
        })
      );
    }

    // 3) Check if there's already a row in `sessions` for this sessionId
    const { data: existingSession, error: existingError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (existingError) {
      console.error('[session] Error checking existing session:', existingError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    let newlyCreated = false;

    // 4) If no row, create one
    if (!existingSession) {
      newlyCreated = true;
      const newSessionData = {
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
      const { error: insertError } = await supabaseAdmin
        .from('sessions')
        .insert([newSessionData]);
      if (insertError) {
        console.error('[session] Error inserting new session:', insertError);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    // 5) Re-fetch the final session row
    const { data: sessionRow, error: fetchError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (fetchError) {
      console.error('[session] Error fetching final session:', fetchError);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!sessionRow) {
      return res.status(500).json({ error: 'Session not found after creation' });
    }

    // 6) If we have ?noBasket=1, remove `basket_details` from the returned data
    if (noBasket && sessionRow.basket_details) {
      delete sessionRow.basket_details;
    }

    // Optional: filter out underscores, etc.
    const filtered = filterData ? filterData(sessionRow, Infinity) : sessionRow;

    // 7) Return
    return res.status(200).json({
      session: filtered,
      newlyCreated,
    });
  } catch (error: any) {
    console.error('[session] Catch Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

