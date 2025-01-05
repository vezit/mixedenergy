// /pages/api/firebase/1-getSession.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import cookie from 'cookie';
import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from 'firebase-admin/firestore';

import { db } from '../../../lib/firebaseAdmin';
import { filterData } from '../../../lib/filterData';

/** 
 * Minimal interface for session data. 
 * Extend or adjust the fields to match your actual Firestore schema.
 */
interface SessionData {
  sessionId: string;
  _orderId?: string | null;
  allowCookies: boolean;
  basketDetails: {
    items: any[];
    customerDetails: {
      customerType: string | null;
      fullName: string | null;
      mobileNumber: string | null;
      email: string | null;
      address: string | null;
      postalCode: string | null;
      city: string | null;
      country: string | null;
    };
    paymentDetails: Record<string, any>;
    deliveryDetails: Record<string, any>;
  };
  _createdAt?: FieldValue;
  _updatedAt?: FieldValue;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Parse cookies from the request headers
    const cookies = cookie.parse(req.headers.cookie || '');
    let sessionId = cookies.session_id;

    // If no session_id cookie exists, create one
    if (!sessionId) {
      sessionId = uuidv4().slice(0, 30);

      // Create a new session document in Firestore
      const newSession: SessionData = {
        sessionId,
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
            country: 'Danmark',
          },
          paymentDetails: {},
          deliveryDetails: {},
        },
        _createdAt: FieldValue.serverTimestamp(),
        _updatedAt: FieldValue.serverTimestamp(),
      };

      await db.collection('sessions').doc(sessionId).set(newSession);

      // Set the session_id cookie on the response
      res.setHeader(
        'Set-Cookie',
        cookie.serialize('session_id', sessionId, {
          httpOnly: true,
          maxAge: 365 * 24 * 60 * 60, // 1 year
          path: '/',
          sameSite: 'Strict', // Adjust to your requirements
          secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        })
      );
    }

    const docRef = db.collection('sessions').doc(sessionId);
    const docSnap = await docRef.get();

    // If the doc doesn't exist, create a new one (this can happen if the user had a stale cookie)
    if (!docSnap.exists) {
      const newSession: SessionData = {
        sessionId,
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
      };

      await docRef.set(newSession);
    }

    // Fetch the (potentially newly created) document
    const data = (await docRef.get()).data() as SessionData | undefined;

    // Exclude fields that start with an underscore (via filterData)
    // The second argument (Infinity) is presumably a depth or level for your filter function
    const filteredData = data ? filterData(data, Infinity) : {};

    // Return the filtered session data
    return res.status(200).json({ session: filteredData });
  } catch (error) {
    console.error('Error fetching session:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
