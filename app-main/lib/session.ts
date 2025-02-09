// lib/session.ts
import axios from 'axios';

export interface SessionResponse {
  session: any;   // adjust to match your actual shape
  newlyCreated: boolean;
}

/**
 * Calls /api/supabase/session, creating a new session if needed,
 * and returning the session row (which may include basket_details).
 */
export async function getSession(withBasket = true): Promise<SessionResponse> {
  const url = withBasket
    ? '/api/supabase/session'        // returns basket_details by default
    : '/api/supabase/session?noBasket=1'; // strips basket_details

  const { data } = await axios.get<SessionResponse>(url, {
    withCredentials: true, // ensure cookies are sent
  });
  return data;
}
