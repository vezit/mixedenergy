// pages/api/updateCustomerDetails.js

import admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import cookie from 'cookie';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY)),
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

    const { customerDetails } = req.body;

    if (!customerDetails) {
      return res.status(400).json({ error: 'Missing customerDetails' });
    }

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
