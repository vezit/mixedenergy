// pages/api/createSession.js

import admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY)),
  });
}
const db = getFirestore();

export default async (req, res) => {
  const { consentId } = req.body;

  if (!consentId) {
    return res.status(400).json({ error: 'Missing consentId' });
  }

  try {
    const docRef = db.collection('sessions').doc(consentId);

    await docRef.set({
      consentId,
      allowCookies: false,
      basketItems: [],
      customerDetails: {},
      createdAt: FieldValue.serverTimestamp(),
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
