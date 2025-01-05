// /pages/api/firebase/1-deleteSession.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/firebaseAdmin'; // Update path if necessary
import cookie from 'cookie';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  try {
    // Allow only POST or DELETE methods
    if (req.method !== 'POST' && req.method !== 'DELETE') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Parse cookies from the request headers
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionId = cookies.session_id;

    if (!sessionId) {
      return res.status(400).json({ error: 'No session ID provided' });
    }

    // Delete the session document from Firestore
    await db.collection('sessions').doc(sessionId).delete();

    return res.status(200).json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
