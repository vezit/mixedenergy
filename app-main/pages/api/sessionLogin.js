// pages/api/sessionLogin.js

import { getAuth } from 'firebase-admin/auth';
import { initializeApp } from 'firebase-admin/app';
import { setCookie } from 'cookies-next';

// Initialize Firebase Admin SDK
initializeApp({
  credential: getApplicationDefault(), // Make sure to load credentials here
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { idToken } = req.body;

  try {
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });

    // Set the session cookie
    setCookie('session', sessionCookie, { req, res, maxAge: expiresIn });

    res.status(200).json({ message: 'Session cookie set' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to set session cookie' });
  }
}
