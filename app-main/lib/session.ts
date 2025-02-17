// lib/session.ts
import axios from 'axios';

export interface SessionResponse {
  newlyCreated: boolean;
  session: any; // refine as needed
}

interface AcceptCookiesResponse {
  success?: boolean;
}

export async function getSession(noBasket = false): Promise<SessionResponse> {
  try {
    const url = noBasket
      ? '/api/supabase/session?noBasket=1'
      : '/api/supabase/session';

    const res = await axios.get<SessionResponse>(url, { withCredentials: true });
    return res.data;
  } catch (err) {
    console.error('getSession() error:', err);
    throw err;
  }
}

export async function deleteSession(sessionId?: string): Promise<void> {
  try {
    await axios.post(
      '/api/supabase/session',
      {
        action: 'deleteSession',
        sessionId,
      },
      { withCredentials: true }
    );
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
}

export async function acceptCookies(sessionId?: string | null): Promise<AcceptCookiesResponse> {
  try {
    const response = await axios.post(
      '/api/supabase/session',
      {
        action: 'acceptCookies',
        sessionId,
      },
      { withCredentials: true }
    );
    return response.data; // { success: true } typically
  } catch (error) {
    console.error('Error accepting cookies:', error);
    throw error;
  }
}

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
 * updateSession - client side
 *    We pass an object so we don't confuse order.
 */
export async function updateSession({
  action,
  data = {},
  sessionId,
}: {
  action: 'addItem' | 'removeItem' | 'updateQuantity' | 'updateCustomerDetails';
  data?: any;
  sessionId?: string;
}): Promise<any> {
  try {
    // The server expects { action, sessionId, ...rest }, so just spread "data"
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
