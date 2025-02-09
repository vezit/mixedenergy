// lib/session.ts

import axios from 'axios';

/**
 * Shape of the server's session response.
 */
export interface SessionResponse {
  newlyCreated: boolean;
  session: any; // You can refine this to match your DB session object
}

interface AcceptCookiesResponse {
  success?: boolean;
  // ...any other fields from the server
}

/**
 * Fetch (or create) a session from the server.
 * - If `noBasket = true`, the server won't create or fetch the basket portion.
 * - Uses GET /api/supabase/session and sets `?noBasket=1` if `noBasket = true`.
 */
export async function getSession(noBasket = false): Promise<SessionResponse> {
  try {
    const url = noBasket
      ? '/api/supabase/session?noBasket=1'
      : '/api/supabase/session';

    const res = await axios.get<SessionResponse>(url, {
      withCredentials: true,
    });
    return res.data;
  } catch (err) {
    console.error('getSession() error:', err);
    throw err;
  }
}

/**
 * Delete a session from the server (and DB). 
 * - The server reads `session_id` from the cookie automatically if present,
 *   but we also send a fallback `sessionId` in case the cookie is missing.
 * - Uses POST /api/supabase/session with `{action: 'deleteSession'}`.
 */
export async function deleteSession(sessionId?: string): Promise<void> {
  try {
    await axios.post(
      '/api/supabase/session',
      {
        action: 'deleteSession',
        // fallback sessionId if needed
        sessionId,
      },
      { withCredentials: true }
    );
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
}

/**
 * Accept cookies for a session.
 * - Uses POST /api/supabase/session with `{action: 'acceptCookies'}`.
 */
export async function acceptCookies(sessionId?: string | null): Promise<AcceptCookiesResponse> {
  try {
    const response = await axios.post(
      '/api/supabase/session',
      {
        action: 'acceptCookies',
        sessionId, // fallback if cookie is blocked
      },
      { withCredentials: true }
    );
    // Return the full data, or just the fields you need
    return response.data; // e.g. { success: true }
  } catch (error) {
    console.error('Error accepting cookies:', error);
    throw error;
  }
}

/**
 * Get the basket for a session specifically.
 * - You can also just call `getSession()` but if you want to do partial requests,
 *   the server can handle `action: 'getBasket'`.
 */
export async function getBasket(sessionId?: string): Promise<any> {
  try {
    const response = await axios.post(
      '/api/supabase/session',
      {
        action: 'getBasket',
        sessionId,
      },
      { withCredentials: true }
    );
    return response.data?.basket ?? null;
  } catch (error) {
    console.error('Error fetching basket:', error);
    throw error;
  }
}

/**
 * Update session details (basket items, customer details, etc.).
 * - POST /api/supabase/session with the action you need:
 *    e.g. 'addItem', 'removeItem', 'updateQuantity', 'updateCustomerDetails'
 */
export async function updateSession(
  action: 'addItem' | 'removeItem' | 'updateQuantity' | 'updateCustomerDetails',
  data: any = {},
  sessionId?: string
): Promise<any> {
  try {
    const response = await axios.post(
      '/api/supabase/session',
      {
        action,
        sessionId,
        ...data,
      },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error(`Error with updateSession (${action}):`, error);
    throw error;
  }
}
