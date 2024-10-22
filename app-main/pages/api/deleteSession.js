// pages/api/deleteSession.js

import admin from 'firebase-admin';
import cookie from 'cookie';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_ADMIN_KEY)
    ),
  });
}
const db = admin.firestore();

export default async (req, res) => {
  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const consentId = cookies.cookie_consent_id;

    if (!consentId) {
      return res.status(400).json({ error: 'Missing consentId in cookies' });
    }

    // Delete the session document corresponding to the consentId
    await db.collection('sessions').doc(consentId).delete();

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
