// /pages/api/sendOrderConfirmation.js

import mailgun from 'mailgun.js';
import formData from 'form-data';
import { db } from '../../lib/firebaseAdmin';

export default async function handler(req, res) {
  // Check if the request method is GET
  if (req.method !== 'GET') {
    console.error(`Method ${req.method} not allowed on /api/sendOrderConfirmation`);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { secret } = req.query;

  // Verify the secret
  if (secret !== 'slkjdsfdslkads') {
    console.error('Unauthorized request to sendOrderConfirmation');
    return res.status(403).json({ message: 'Forbidden' });
  }

  // Initialize Mailgun client
  const mg = new mailgun(formData);
  const mailgunClient = mg.client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY || '',
    url: 'https://api.eu.mailgun.net', // Added to specify the EU endpoint
  });

  const DOMAIN = process.env.MAILGUN_DOMAIN || '';

  // Define email data
  const emailData = {
    from: 'MixedEnergy <info@mixedenergy.dk>',
    to: 'victor@reipur.com', // Replace with the recipient's email
    subject: 'Ordrenummer: MM03A3D9C89', // Updated to match the specified format
    html: `<html>
      <body>
        <h1>Hello World</h1>
        <p>This is your order confirmation. from next js</p>
      </body>
    </html>`,
  };

  try {
    console.log('Order Confirmation Email Data:', emailData);

    // Send the email
    const mgResponse = await mailgunClient.messages.create(DOMAIN, emailData);

    console.log('Mailgun Response:', mgResponse);

    // Get the Mailgun assigned Message-Id
    const messageId = mgResponse.id; // Includes angle brackets

    // Extract recipient email address
    const extractEmailAddress = (str) => {
      const match = str.match(/<([^>]+)>/);
      if (match) {
        return match[1];
      } else {
        return str.trim();
      }
    };

    const recipientEmail = extractEmailAddress(emailData.to);

    // Store the sent email in Firestore
    const docRef = db.collection('emails').doc();
    await docRef.set({
      timestamp: new Date().toISOString(),
      sender: 'info@mixedenergy.dk',
      recipient: recipientEmail,
      subject: emailData.subject,
      bodyPlain: emailData.html,
      messageId,
      inReplyTo: null,
      threadId: messageId,
      receivedAt: new Date(),
    });

    console.log(`Stored order confirmation email in Firestore with ID: ${docRef.id}`);

    return res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ message: 'Error sending email', error });
  }
}
