// lib/session.ts
import axios from 'axios';

export interface SessionResponse {
  session: any; // adjust this type as needed
  newlyCreated: boolean;
}

let sessionPromise: Promise<SessionResponse> | null = null;

export function getOrCreateSessionRequest(): Promise<SessionResponse> {
  if (!sessionPromise) {
    sessionPromise = axios
      .post<SessionResponse>(
        '/api/supabase/getOrCreateSession',
        {},
        { withCredentials: true }
      )
      .then((res) => res.data)
      .catch((err) => {
        // If the request fails, reset the promise so subsequent calls can try again.
        sessionPromise = null;
        throw err;
      });
  }
  return sessionPromise;
}
