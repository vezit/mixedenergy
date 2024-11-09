// pages/api/firebase/1-createSession.js

import { db } from '../../../lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export default async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId in request body' });
    }

    const docRef = db.collection('sessions').doc(sessionId);

    const doc = await docRef.get();
    if (doc.exists) {
      return res.status(400).json({ error: 'Session ID already exists' });
    }

    await docRef.set({
      sessionId: sessionId,
      orderId: null,
      allowCookies: false,
      basketDetails: {
        items: [],
        customerDetails: {
          customerType: null,
          fullName: null,
          mobileNumber: null,
          email: null,
          address: null,
          postalCode: null,
          city: null,
          country: null,
        },
        paymentDetails: {},
        deliveryDetails: {},
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
