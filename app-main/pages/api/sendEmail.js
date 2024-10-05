// /pages/api/sendEmail.js

import mailgun from 'mailgun.js';
import formData from 'form-data';
import { db } from '../../lib/firebaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { to, subject, text, inReplyToMessageId, threadId } = req.body;

  // Initialize Mailgun client
  const mg = new mailgun(formData);
  const mailgunClient = mg.client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY || '',
    url: 'https://api.eu.mailgun.net', // Adjust if necessary for your region
  });

  const DOMAIN = process.env.MAILGUN_DOMAIN || '';

  // Generate a unique message ID
  const messageId = `<${Date.now()}-${Math.random().toString(36).substring(2, 15)}@${DOMAIN}>`;

  // Define email data
  const emailData = {
    from: 'MixedEnergy <info@mixedenergy.dk>',
    to,
    subject,
    text,
    'h:Message-Id': messageId,
  };

  if (inReplyToMessageId) {
    emailData['h:In-Reply-To'] = inReplyToMessageId;
    emailData['h:References'] = inReplyToMessageId;
  }

  try {
    // Send the email
    await mailgunClient.messages.create(DOMAIN, emailData);

    // Store the sent email in Firestore
    const docRef = db.collection('emails').doc();
    await docRef.set({
      sender: 'info@mixedenergy.dk',
      recipient: to,
      subject,
      bodyPlain: text,
      messageId,
      inReplyTo: inReplyToMessageId || null,
      threadId: threadId || messageId,
      receivedAt: new Date(),
    });

    return res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ message: 'Error sending email', error });
  }
}
