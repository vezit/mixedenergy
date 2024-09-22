// pages/api/sessionLogin.js
import admin from '../../lib/firebaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).send({ error: 'ID token missing' });
  }

  // Set session expiration to 5 days
  const expiresIn = 60 * 60 * 24 * 5 * 1000;

  try {
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });
    const options = {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    };
    res.setHeader('Set-Cookie', `session=${sessionCookie}; Max-Age=${expiresIn}; HttpOnly; Secure; Path=/`);
    res.status(200).send({ status: 'success' });
  } catch (error) {
    console.error('Error creating session cookie', error);
    res.status(500).send({ error: 'Internal error' });
  }
}
