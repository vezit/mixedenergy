// /pages/test-session.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface SessionResponse {
  session?: any;
  newlyCreated?: boolean;
  error?: string;
}

export default function TestSessionPage() {
  const [sessionData, setSessionData] = useState<SessionResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      try {
        const response = await axios.get<SessionResponse>('/api/supabase/getSession');
        setSessionData(response.data);
      } catch (error) {
        console.error('Error fetching session:', error);
        setSessionData({ error: 'Request failed' });
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  if (loading) {
    return <p>Loading session...</p>;
  }

  if (sessionData?.error) {
    return <p>Error: {sessionData.error}</p>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Test Session Page</h1>
      <p>Response from getSession endpoint:</p>
      <pre style={{ background: '#eee', padding: '1rem' }}>
        {JSON.stringify(sessionData, null, 2)}
      </pre>
      {sessionData?.newlyCreated ? (
        <p style={{ color: 'green' }}>A new session cookie was created!</p>
      ) : (
        <p style={{ color: 'blue' }}>Existing session cookie found or re-fetched.</p>
      )}
    </div>
  );
}
