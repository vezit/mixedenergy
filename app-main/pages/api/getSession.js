// pages/api/getSession.js

// import admin from 'firebase-admin';
// import cookie from 'cookie';

// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY)),
//   });
// }

// const db = admin.firestore();

import { db } from '../../lib/firebaseAdmin';
import cookie from 'cookie';

export default async function handler(req, res) {
  try {
    // Parse cookies from the request headers
    const cookies = cookie.parse(req.headers.cookie || '');
    const consentId = cookies.cookie_consent_id;

    if (!consentId) {
      return res.status(400).json({ error: 'Missing consentId in cookies' });
    }

    const docRef = db.collection('sessions').doc(consentId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const data = docSnap.data();

    // Return the session data
    res.status(200).json({ session: data });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
