// pages/api/checkAuth.js

import admin from 'firebase-admin';
import cookie from 'cookie'; // Import the cookie module

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY)),
  });
}

export default async function handler(req, res) {
  try {
    // Parse the cookies on the request
    const cookies = cookie.parse(req.headers.cookie || '');

    // Retrieve the session cookie from the parsed cookies
    const sessionCookie = cookies.session || '';

    // Verify the session cookie, check if it's valid and corresponds to a signed-in user
    const decodedClaims = await admin
      .auth()
      .verifySessionCookie(sessionCookie, true);

    // If successful, return the user's email and authentication status
    return res.status(200).json({
      loggedIn: true,
      email: decodedClaims.email,
    });
  } catch (error) {
    // If verification fails, return not logged in status
    return res.status(200).json({
      loggedIn: false,
    });
  }
}
