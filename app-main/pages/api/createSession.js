// pages/api/createSession.js

import { db } from '../../lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import cookie from 'cookie';



export default async (req, res) => {
  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const consentAndSessionId  = cookies.consent_and_session_id;

    if (!consentAndSessionId) {
      return res.status(400).json({ error: 'Missing consent_and_session_id in cookies' });
    }

    const docRef = db.collection('sessions').doc(consentAndSessionId);

    await docRef.set(
      {
        sessionId: consentAndSessionId,
        orderId: null,
        allowCookies: false,
        basketDetails: {
          items: [],
          customerDetails: {
            customerType:   null,
            fullName:       null,
            mobileNumber:   null,
            email:          null,
            address:        null,
            postalCode:     null,
            city:           null,
            country:        null,
          },
          paymentDetails: {},
          deliveryDetails: {},
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
