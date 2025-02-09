// lib/api/session/deleteSession.ts

// lib/api/session/deleteSession.ts
import { supabaseAdmin } from '../supabaseAdmin';

/**
 * Physically separates the "delete session" logic into this file.
 * 
 * This function deletes the row from the "sessions" table by session_id.
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('sessions')
    .delete()
    .eq('session_id', sessionId);

  if (error) {
    throw new Error(`Error deleting session: ${error.message}`);
  }
}
