// pages/api/updateCustomerDetails.js

import admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY)),
  });
}
const db = getFirestore();

export default async (req, res) => {
  const { consentId, customerDetails } = req.body;

  if (!consentId || !customerDetails) {
    return res.status(400).json({ error: 'Missing consentId or customerDetails' });
  }

  try {
    const docRef = db.collection('sessions').doc(consentId);

    await docRef.set(
      {
        customerDetails,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating customer details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
