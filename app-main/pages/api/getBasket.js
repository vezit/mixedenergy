// pages/api/getBasket.js

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY)),
  });
}
const db = getFirestore();

export default async (req, res) => {
  const { consentId } = req.query;

  if (!consentId) {
    return res.status(400).json({ error: 'Missing consentId' });
  }

  try {
    const docRef = db.collection('sessions_public').doc(consentId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const data = docSnap.data();
    res.status(200).json({
      basketItems: data.basketItems || [],
      customerDetails: data.customerDetails || {},
      allowCookies: data.allowCookies || false,
    });
  } catch (error) {
    console.error('Error fetching basket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
