// pages/api/inbound-email-helloworld.js

import { db } from '../../lib/firebaseAdmin'; // Firestore admin import

export default async function handler(req, res) {
  console.log('FIREBASE_ADMIN_KEY:', process.env.FIREBASE_ADMIN_KEY);
  if (req.method !== 'POST') {
    console.warn(`Method ${req.method} not allowed on /api/inbound-email`);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Parse JSON data from the request body
    const { timestamp, token, signature, sender, recipient, subject, 'body-plain': bodyPlain } = req.body;

    console.log('Received data:', req.body);

    // Check that essential fields are present
    if (!timestamp || !token || !signature || !sender || !recipient || !subject || !bodyPlain) {
      console.error('Missing required fields');
      return res.status(400).json({ message: 'Bad Request: Missing required fields' });
    }

    // Generate a new document ID automatically with Firestore
    const docRef = db.collection('test-email').doc(); // Generate unique document ID

    // Store the email data in Firestore
    await docRef.set({
      timestamp,
      token,
      signature,
      sender,
      recipient,
      subject,
      bodyPlain,
      receivedAt: new Date(),
    });

    console.log(`Stored email in Firestore with ID: ${docRef.id}`);

    // Respond with success and the generated document ID
    return res.status(200).json({
      message: 'Email data received and stored successfully',
      documentId: docRef.id,
    });
  } catch (error) {
    console.error('Error storing email:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
