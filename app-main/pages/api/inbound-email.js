// pages/api/inbound-email.js

import crypto from 'crypto';
import { db } from '../../lib/firebaseAdmin'; // Import db from firebaseAdmin.js
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false, // Disable Next.js's default body parsing
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.warn(`Method ${req.method} not allowed on /api/inbound-email`);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Error parsing the form data', err);
      return res.status(400).json({ message: 'Bad Request: Error parsing form data' });
    }

    // Extract necessary fields from Mailgun's POST request
    const { timestamp, token, signature } = fields;

    // Verify that required fields are present
    if (!timestamp || !token || !signature) {
      console.error('Missing required fields: timestamp, token, or signature');
      return res.status(400).json({ message: 'Bad Request: Missing timestamp, token, or signature' });
    }

    // Verify the Mailgun signature
    const apiKey = process.env.MAILGUN_GLOBAL_API_KEY;
    if (!apiKey) {
      console.error('MAILGUN_GLOBAL_API_KEY is not defined in environment variables');
      return res.status(500).json({ message: 'Server configuration error: MAILGUN_GLOBAL_API_KEY is missing' });
    }

    const hmac = crypto
      .createHmac('sha256', apiKey)
      .update(timestamp.concat(token))
      .digest('hex');

    if (hmac !== signature) {
      console.error('Invalid Mailgun signature');
      return res.status(403).json({ message: 'Invalid signature' });
    }

    // Extract email data
    const { sender, recipient, subject, 'body-plain': bodyPlain } = fields;

    // Verify that required email fields are present
    if (!sender || !recipient || !subject || !bodyPlain) {
      console.error('Missing email data fields');
      return res.status(400).json({ message: 'Bad Request: Missing email data fields' });
    }

    // Store email data in Firestore
    try {
      const emailDocId = `${timestamp}-${token}`;
      await db.collection('emails').doc(emailDocId).set({
        sender,
        recipient,
        subject,
        bodyPlain,
        receivedAt: new Date(),
      });

      console.log(`Email from ${sender} stored with ID: ${emailDocId}`);

      // Respond to Mailgun
      res.status(200).json({ message: 'Email received and processed' });
    } catch (error) {
      console.error('Error storing email:', error);
      res.status(500).json({ message: 'Error storing email', error: error.message });
    }
  });
}
