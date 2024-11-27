// /api/firebase/1-getSession.js

import { db } from '../../../lib/firebaseAdmin';
import cookie from 'cookie';
import { filterData } from '../../../lib/filterData';
import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from 'firebase-admin/firestore';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Parse cookies from the request headers
    const cookies = cookie.parse(req.headers.cookie || '');
    let sessionId = cookies.session_id;

    if (!sessionId) {
      // No session_id cookie, generate a new session ID
      sessionId = uuidv4().slice(0, 30);

      // Create a new session in the database
      await db.collection('sessions').doc(sessionId).set({
        sessionId: sessionId,
        _orderId: null,
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
            country: "Danmark",
          },
          paymentDetails: {},
          deliveryDetails: {},
        },
        _createdAt: FieldValue.serverTimestamp(),
        _updatedAt: FieldValue.serverTimestamp(),
      });

      // Set the session_id cookie
      res.setHeader('Set-Cookie', cookie.serialize('session_id', sessionId, {
        httpOnly: true,
        maxAge: 365 * 24 * 60 * 60, // 1 year
        path: '/',
        sameSite: 'Strict', // Adjust based on your requirements
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      }));
    }

    const docRef = db.collection('sessions').doc(sessionId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      // Session does not exist in the database, create a new one
      await db.collection('sessions').doc(sessionId).set({
        sessionId: sessionId,
        _orderId: null,
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
        _createdAt: FieldValue.serverTimestamp(),
        _updatedAt: FieldValue.serverTimestamp(),
      });
    }

    const data = (await docRef.get()).data();

    // Exclude fields that start with an underscore
    const filteredData = filterData(data, Infinity);

    // Return the filtered session data
    res.status(200).json({ session: filteredData });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
