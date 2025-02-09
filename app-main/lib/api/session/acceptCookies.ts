// lib/api/session/acceptCookies.ts
import { supabaseAdmin } from '../supabaseAdmin';

export async function acceptCookies(sessionId: string): Promise<{ success: boolean }> {
  // 1) Check the session row exists
  const { data: existingSession, error: selectError } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (selectError) {
    throw new Error(`Error checking session: ${selectError.message}`);
  }
  if (!existingSession) {
    throw new Error('Session not found');
  }

  // 2) Use your RPC "accept_cookies"
  const { error: rpcError } = await supabaseAdmin.rpc('accept_cookies', {
    session_id_param: sessionId,
  });
  if (rpcError) {
    throw new Error(`Error updating session via RPC: ${rpcError.message}`);
  }

  return { success: true };
}
