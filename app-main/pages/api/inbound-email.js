import crypto from 'crypto';
import { db } from '../../lib/firebaseAdmin';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false, // Disable default body parsing to handle raw POST data
  },
};

export default async function handler(req, res) {
  const secret = req.query.secret;

  // Check if the secret is correct
  if (secret !== process.env.SECRET_INCOMING_MAIL_PARAMETER) {
    console.error('Unauthorized request');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    console.warn(`Method ${req.method} not allowed on /api/inbound-email`);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const form = new formidable.IncomingForm();
  
  form.parse(req, async (err, fields) => {
    if (err) {
      console.error('Error parsing form data', err);
      return res.status(400).json({ message: 'Error parsing form data' });
    }

    const { timestamp, token, signature, sender, recipient, subject, 'body-plain': bodyPlain } = fields;

    if (!timestamp || !token || !signature || !sender || !recipient || !subject || !bodyPlain) {
      console.error('Missing required fields');
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify Mailgun signature
    const apiKey = process.env.MAILGUN_GLOBAL_API_KEY;
    const hmac = crypto.createHmac('sha256', apiKey).update(timestamp.concat(token)).digest('hex');
    if (hmac !== signature) {
      console.error('Invalid Mailgun signature');
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

      console.log(`Stored email with ID: ${emailDocId}`);
      return res.status(200).json({ message: 'Email received and processed' });
    } catch (error) {
      console.error('Error storing email:', error);
      return res.status(500).json({ message: 'Error storing email', error: error.message });
    }
  });
}
