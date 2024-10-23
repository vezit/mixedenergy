// pages/api/deleteSession.js


import cookie from 'cookie';

import { db } from '../../lib/firebaseAdmin';

export default async (req, res) => {
  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const consentId = cookies.cookie_consent_id;

    if (!consentId) {
      return res.status(400).json({ error: 'Missing consentId in cookies' });
    }

    // Delete the session document corresponding to the consentId
    await db.collection('sessions').doc(consentId).delete();

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
