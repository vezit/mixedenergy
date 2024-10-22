// pages/api/updateBasket.js

import admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY)),
  });
}
const db = getFirestore();

export default async (req, res) => {
  const { consentId, basketItems } = req.body;

  if (!consentId || !basketItems) {
    return res.status(400).json({ error: 'Missing consentId or basketItems' });
  }

  try {
    const docRef = db.collection('sessions_public').doc(consentId);

    await docRef.set(
      {
        basketItems,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating basket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
