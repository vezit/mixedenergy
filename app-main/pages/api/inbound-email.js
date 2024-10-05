// /pages/api/inbound-email.js

import crypto from 'crypto';
import { db } from '../../lib/firebaseAdmin';

export const config = {
  api: {
    bodyParser: true, // Enable Next.js's default body parsing
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const secret = req.query.secret;

  // Check if the secret parameter is correct
  if (secret !== process.env.SECRET_INCOMING_MAIL_PARAMETER) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Access form data from req.body
  const fields = req.body;

  // Ensure fields are strings
  const getStringValue = (field) => {
    if (Array.isArray(field)) return field[0];
    return field;
  };

  let timestamp = getStringValue(fields.timestamp);
  let token = getStringValue(fields.token);
  let signature = getStringValue(fields.signature);
  let sender = getStringValue(fields.sender);
  let recipient = getStringValue(fields.recipient);
  let subject = getStringValue(fields.subject);
  let bodyPlain = getStringValue(fields['body-plain']);

  if (!timestamp || !token || !signature || !sender || !recipient || !subject || !bodyPlain) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Verify Mailgun signature
  const apiKey = process.env.MAILGUN_GLOBAL_API_KEY;
  const hmac = crypto.createHmac('sha256', apiKey).update(timestamp + token).digest('hex');
  if (hmac !== signature) {
    return res.status(403).json({ message: 'Invalid signature' });
  }

  try {
    const emailDocId = `${timestamp}-${token}`;
    await db.collection('emails').doc(emailDocId).set({
      sender,
      recipient,
      subject,
      bodyPlain,
      receivedAt: new Date(),
    });

    return res.status(200).json({ message: 'Email received and stored' });
  } catch (error) {
    console.error('Error storing email:', error);
    return res.status(500).json({ message: 'Error storing email', error: error.message });
  }
}
