import { db } from '../../lib/firebaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.warn(`Method ${req.method} not allowed on /api/inbound-email`);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    console.log('Received email data:', req.body);

    // Helper to safely extract string values, ensuring they are not undefined
    const getStringValue = (field) => (Array.isArray(field) ? field[0] : field || '');

    const timestamp = getStringValue(req.body.timestamp);
    const sender = getStringValue(req.body.sender);
    const recipient = getStringValue(req.body.recipient);
    const subject = getStringValue(req.body.subject);
    const bodyPlain = getStringValue(req.body['body-plain']);
    const messageHeadersJson = getStringValue(req.body['message-headers']);

    // Validate all required fields
    if (!timestamp || !sender || !recipient || !subject || !bodyPlain || !messageHeadersJson) {
      console.error('Missing required fields');
      return res.status(400).json({ message: 'Bad Request: Missing required fields' });
    }

    // Extract messageId and inReplyTo from headers, if available
    let messageId = null;
    let inReplyTo = null;

    try {
      const messageHeaders = JSON.parse(messageHeadersJson);
      messageHeaders.forEach(([headerName, headerValue]) => {
        if (headerName.toLowerCase() === 'message-id') messageId = headerValue;
        if (headerName.toLowerCase() === 'in-reply-to') inReplyTo = headerValue;
      });
    } catch (err) {
      console.error('Error parsing message headers:', err);
    }

    // Make sure messageId exists to avoid undefined errors
    if (!messageId) {
      console.error('Message ID is missing');
      return res.status(400).json({ message: 'Bad Request: Missing message ID' });
    }

    // Clean messageId and inReplyTo (remove < > if they exist)
    const cleanMessageId = messageId.replace(/[<>]/g, '');
    const cleanInReplyTo = inReplyTo ? inReplyTo.replace(/[<>]/g, '') : null;

    console.log('Cleaned messageId:', cleanMessageId);
    console.log('Cleaned inReplyTo:', cleanInReplyTo);

    // Store the email data in Firestore
    await db.collection('emails').add({
      timestamp,
      sender,
      recipient,
      subject,
      bodyPlain,
      messageId: cleanMessageId,
      inReplyTo: cleanInReplyTo,
      receivedAt: new Date(),
    });

    console.log('Email stored successfully.');

    return res.status(200).json({
      message: 'Email data received and stored successfully',
    });
  } catch (error) {
    console.error('Error storing email:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
