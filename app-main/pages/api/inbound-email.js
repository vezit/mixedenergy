// /pages/api/inbound-email.js

import { db } from '../../lib/firebaseAdmin'; // Firestore admin import

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.warn(`Method ${req.method} not allowed on /api/inbound-email`);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const secret = req.query.secret;

  // Check if the secret parameter is correct
  if (secret !== process.env.SECRET_INCOMING_MAIL_PARAMETER) {
    console.error('Unauthorized request');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Access form data from req.body
    const getStringValue = (field) => {
      if (Array.isArray(field)) return field[0];
      return field;
    };

    const timestamp = getStringValue(req.body.timestamp);
    const sender = getStringValue(req.body.sender);
    const recipient = getStringValue(req.body.recipient);
    const subject = getStringValue(req.body.subject);
    const bodyPlain = getStringValue(req.body['body-plain']);

    // Parse message headers to extract messageId and inReplyTo
    const messageHeadersJson = getStringValue(req.body['message-headers']);
    let messageId = null;
    let inReplyTo = null;

    if (messageHeadersJson) {
      try {
        const messageHeaders = JSON.parse(messageHeadersJson);
        for (const [headerName, headerValue] of messageHeaders) {
          if (headerName.toLowerCase() === 'message-id') {
            messageId = headerValue;
          } else if (headerName.toLowerCase() === 'in-reply-to') {
            inReplyTo = headerValue;
          }
        }
      } catch (err) {
        console.error('Error parsing message-headers:', err);
      }
    }

    console.log('Received data:', req.body);

    // Check that essential fields are present
    if (!timestamp || !sender || !recipient || !subject || !bodyPlain || !messageId) {
      console.error('Missing required fields');
      return res.status(400).json({ message: 'Bad Request: Missing required fields' });
    }

    // Determine the threadId
    let threadId = messageId; // Default to messageId if no inReplyTo

    if (inReplyTo) {
      // Find the parent email to get the threadId
      const parentEmailSnapshot = await db
        .collection('emails')
        .where('messageId', '==', inReplyTo)
        .limit(1)
        .get();

      if (!parentEmailSnapshot.empty) {
        threadId = parentEmailSnapshot.docs[0].data().threadId;
      }
    }

    // Generate a new document ID automatically with Firestore
    const docRef = db.collection('emails').doc(); // Generate unique document ID

    // Store the email data in Firestore
    await docRef.set({
      timestamp,
      sender,
      recipient,
      subject,
      bodyPlain,
      messageId,
      inReplyTo,
      threadId,
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
