// pages/api/firebase/5-getBasket.js

import { admin, db } from '../../../lib/firebaseAdmin';
import cookie from 'cookie';

export default async (req, res) => {
  try {
    // Only accept GET requests
    if (req.method !== 'GET') {
      return res.status(405).end(); // Method Not Allowed
    }

    // Parse cookies to get the sessionId
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionId = cookies.session_id;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId in cookies' });
    }

    // Reference to the session document in Firestore
    const sessionDocRef = db.collection('sessions').doc(sessionId);
    const sessionDoc = await sessionDocRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessionDoc.data();

    // Extract basketDetails
    const basketDetails = sessionData.basketDetails || {};

    res.status(200).json({ basketDetails });
  } catch (error) {
    console.error('Error fetching basket:', error);
    res.status(500).json({ error: 'Error fetching basket' });
  }
};
