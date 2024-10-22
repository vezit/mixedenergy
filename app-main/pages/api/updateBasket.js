// pages/api/updateBasket.js

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

    const { basketItems } = req.body;

    // Update the session document
    await db.collection('sessions').doc(consentId).update({ basketItems });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating basket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
