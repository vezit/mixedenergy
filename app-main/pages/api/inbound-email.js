// pages/api/inbound-email.js

import crypto from 'crypto';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  initializeApp({
    credential: cert({
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url:
        'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    }),
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Extract necessary fields from Mailgun's POST request
  const { timestamp, token, signature } = req.body;

  // Verify the Mailgun signature
  const apiKey = process.env.MAILGUN_API_KEY;
  const hmac = crypto
    .createHmac('sha256', apiKey)
    .update(timestamp.concat(token))
    .digest('hex');

  if (hmac !== signature) {
    return res.status(403).json({ message: 'Invalid signature' });
  }

  // Extract email data
  const { sender, recipient, subject, 'body-plain': bodyPlain } = req.body;

  // Store email data in Firestore
  try {
    const emailDocId = `${timestamp}-${token}`;
    await db.collection('emails').doc(emailDocId).set({
      sender,
      recipient,
      subject,
      bodyPlain,
      receivedAt: Timestamp.now(),
    });

    console.log(`Email from ${sender} stored with ID: ${emailDocId}`);

    // Respond to Mailgun
    res.status(200).json({ message: 'Email received and processed' });
  } catch (error) {
    console.error('Error storing email:', error);
    res.status(500).json({ message: 'Error storing email', error });
  }
}
