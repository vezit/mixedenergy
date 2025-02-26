// lib/api/session/getOrCreateSession.ts

import { parse } from 'cookie';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../supabaseAdmin';

/** Session-related interfaces */
export interface SessionRow {
  session_id: string;
  basket_details?: BasketDetails;
  allow_cookies?: boolean;
  temporary_selections?: Record<string, any>;
}

interface BasketDetails {
  items?: BasketItem[];
  customerDetails?: CustomerDetails;
  deliveryDetails?: any;
  paymentDetails?: any;
}

interface BasketItem {
  slug: string;
  quantity: number;
}

interface CustomerDetails {
  fullName?: string | null;
  mobileNumber?: string | null;
}

/**
 * getOrCreateSession
 *   1) If there's a cookie 'session_id', attempt to retrieve that session from DB.
 *      - If it exists, return it.
 *      - If not found, create a new session.
 *   2) If no 'session_id' cookie, create a new session.
 *   3) If noBasket = true, remove basket_details before returning.
 */
export async function getOrCreateSession(cookieHeader?: string, noBasket = false) {
  // 1) Parse the cookie
  const cookies = cookieHeader ? parse(cookieHeader) : {};
  let sessionId = cookies['session_id'];
  let newlyCreated = false;

  console.log('[getOrCreateSession] session_id from cookie:', sessionId);

  // 2) If we DO have a session_id in cookies, attempt to fetch from DB
  if (sessionId) {
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle<SessionRow>();

    if (error) {
      console.error('[getOrCreateSession] Error fetching session:', error);
      throw new Error(`Error fetching session by cookie: ${error.message}`);
    }

    // 2a) If found in DB => return it
    if (data) {
      console.log('[getOrCreateSession] Found existing session in DB:', data.session_id);

      if (noBasket && data.basket_details) {
        delete data.basket_details;
      }

      return {
        newlyCreated: false,
        session: data,
        sessionId: data.session_id,
      };
    }

    // 2b) If NOT found in DB => treat as if there's NO cookie
    console.warn(
      '[getOrCreateSession] Cookie with session_id exists, but no DB row found. Generating a new session.'
    );
  }

  // 3) If no cookie or DB row doesn't exist => create a brand-new session_id
  sessionId = uuidv4().slice(0, 20); // Consider removing .slice(0,30) if collisions are a concern
  newlyCreated = true;

  console.log('[getOrCreateSession] Creating NEW session:', sessionId);

  // 4) Insert a new row
  const { data: insertData, error: insertErr } = await supabaseAdmin
  .from('sessions')
  .insert([
    {
      session_id: sessionId,
      allow_cookies: false,
      basket_details: {
        items: [],
        customerDetails: { fullName: null, mobileNumber: null },
        deliveryDetails: {},
        paymentDetails: {},
      },
    },
  ])
  .select('*')   // <-- This ensures we get the actual row
  .single();

  if (insertErr) {
    console.error('[getOrCreateSession] Error inserting new session row:', insertErr);
    throw new Error(`Error creating session row: ${insertErr.message}`);
  }

  // insertData might have the newly created row. If not, we can fetch it again:
  // But .single() should return the inserted row as "data".
  if (!insertData) {
    throw new Error('[getOrCreateSession] Insert succeeded but no data returned.');
  }


  // 6) Return the brand-new session
  return {
    newlyCreated,
    session: insertData,
    sessionId,
  };
}
