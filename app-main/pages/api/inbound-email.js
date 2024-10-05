import { db } from '../../lib/firebaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.warn(`Method ${req.method} not allowed on /api/inbound-email`);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    console.log('Received email data:', req.body);

    const getStringValue = (field) => {
      if (Array.isArray(field)) return field[0];
      return field || '';
    };

    const extractEmailAddress = (str) => {
      if (!str) return '';
      const match = str.match(/<([^>]+)>/);
      return match ? match[1] : str.trim();
    };

    const timestamp = getStringValue(req.body.timestamp);
    const rawSender = getStringValue(req.body.sender);
    const rawRecipient = getStringValue(req.body.recipient);
    const subject = getStringValue(req.body.subject);
    const bodyPlain = getStringValue(req.body['body-plain']);

    const sender = extractEmailAddress(rawSender);
    const recipient = extractEmailAddress(rawRecipient);

    // Parse message headers to extract messageId and inReplyTo
    const messageHeadersJson = getStringValue(req.body['message-headers']);
    let messageId = null;
    let inReplyTo = null;

    if (messageHeadersJson) {
      try {
        const messageHeaders = JSON.parse(messageHeadersJson);
        messageHeaders.forEach(([headerName, headerValue]) => {
          if (headerName.toLowerCase() === 'message-id') {
            messageId = headerValue || null;
          } else if (headerName.toLowerCase() === 'in-reply-to') {
            inReplyTo = headerValue || null;
          }
        });
      } catch (err) {
        console.error('Error parsing message-headers:', err);
      }
    }

    console.log('Parsed messageId:', messageId);
    console.log('Parsed inReplyTo:', inReplyTo);

    if (!timestamp || !sender || !recipient || !subject || !bodyPlain || !messageId) {
      console.error('Missing required fields');
      return res.status(400).json({ message: 'Bad Request: Missing required fields' });
    }

    // Safely clean up messageId and inReplyTo (only if they exist and are valid)
    const cleanMessageId = messageId ? messageId.replace(/[<>]/g, '') : null;
    const cleanInReplyTo = inReplyTo ? inReplyTo.replace(/[<>]/g, '') : null;

    console.log('Clean messageId:', cleanMessageId);
    console.log('Clean inReplyTo:', cleanInReplyTo);

    // Determine the threadId
    let threadId = cleanMessageId; // Default to the current messageId

    if (cleanInReplyTo) {
      // Find the parent email to get the threadId
      const parentEmailSnapshot = await db
        .collection('emails')
        .where('messageId', '==', cleanInReplyTo)
        .limit(1)
        .get();

      if (!parentEmailSnapshot.empty) {
        threadId = parentEmailSnapshot.docs[0].data().threadId;
      } else {
        console.warn('Parent email not found for inReplyTo:', cleanInReplyTo);
        // Use inReplyTo as threadId to group orphaned replies
        threadId = cleanInReplyTo;
      }
    }

    // Store the email data in Firestore
    await db.collection('emails').add({
      timestamp,
      sender,
      recipient,
      subject,
      bodyPlain,
      messageId: cleanMessageId,
      inReplyTo: cleanInReplyTo,
      threadId,
      receivedAt: new Date(),
    });

    console.log('Stored email in Firestore.');

    return res.status(200).json({
      message: 'Email data received and stored successfully',
    });
  } catch (error) {
    console.error('Error storing email:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
