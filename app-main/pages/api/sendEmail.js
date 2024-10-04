// pages/api/sendEmail.js

import mailgun from 'mailgun.js';
import formData from 'form-data';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { to, subject, text } = req.body;

  // Initialize Mailgun client
  const mg = new mailgun(formData);
  const mailgunClient = mg.client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY || '',
    url: 'https://api.eu.mailgun.net', // Adjust if necessary for your region
  });

  const DOMAIN = process.env.MAILGUN_DOMAIN || '';

  // Define email data
  const emailData = {
    from: 'MixedEnergy <info@mixedenergy.dk>',
    to,
    subject,
    text,
  };

  try {
    // Send the email
    await mailgunClient.messages.create(DOMAIN, emailData);

    return res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ message: 'Error sending email', error });
  }
}
