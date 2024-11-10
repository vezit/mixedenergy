// pages/api/firebase/1-acceptCookies.js

import { db } from '../../../lib/firebaseAdmin';
import cookie from 'cookie';
import { FieldValue } from 'firebase-admin/firestore';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Parse cookies from the request headers
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionId = cookies.session_id;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Missing sessionId in cookies. Please enable cookies for the site to function.',
      });
    }

    const docRef = db.collection('sessions').doc(sessionId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Update allowCookies to true
    await docRef.update({
      allowCookies: true,
      _updatedAt: FieldValue.serverTimestamp(),
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating cookie consent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
