// lib/session.ts
import axios from 'axios';

export interface SessionResponse {
  newlyCreated: boolean;
  session: any; // shape of your "sessions" row
}

/**
 * If you want the basket, call getSession(). If you want to skip the basket,
 * call getSession(true).
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
