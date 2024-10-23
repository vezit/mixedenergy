// pages/api/acceptCookies.js

import { db } from '../../lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import cookie from 'cookie';



export default async (req, res) => {
  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const consentId = cookies.cookie_consent_id;

    if (!consentId) {
      return res.status(400).json({ error: 'Missing consentId in cookies' });
    }

    const docRef = db.collection('sessions').doc(consentId);

    await docRef.set(
      {
        allowCookies: true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating cookie consent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
