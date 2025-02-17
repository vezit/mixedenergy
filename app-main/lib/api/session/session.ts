// lib/api/session/session.ts
import { supabaseAdmin } from '../supabaseAdmin';
import type { SessionRow } from './getOrCreateSession';
import { deleteSession } from './deleteSession';
import { acceptCookies } from './acceptCookies';
import { updateSession } from './updateSession';
import { getOrCreateSession } from './getOrCreateSession';

/**
 * getBasket - returns basket_details from the "sessions" table
 */
export async function getBasket(sessionId: string) {
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('basket_details')
    .eq('session_id', sessionId)
    .maybeSingle<SessionRow>();

  if (error) {
    throw new Error(`Error getBasket: ${error.message}`);
  }
  if (!data) {
    throw new Error('Session not found');
  }

  return data.basket_details;
}

/**
 * Re-export the other session-related utilities
 */
export {
  getOrCreateSession,
  deleteSession,
  acceptCookies,
  updateSession,
};
