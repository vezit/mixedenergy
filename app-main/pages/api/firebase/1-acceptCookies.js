// pages/api/firebase/1-acceptCookies.js

import { db } from '../../../lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export default async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId in cookies. Please enable cookies for the site to function.' });
    }

    const docRef = db.collection('sessions').doc(sessionId);

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
