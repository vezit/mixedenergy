// pages/api/sendOrderConfirmation.js

import mailgun from 'mailgun.js';
import formData from 'form-data';

export default async function handler(req, res) {
  // Check if the request method is GET
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { secret } = req.query;

  // Verify the secret
  if (secret !== 'slkjdsfdslkads') {
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
    from: 'Mixedenergy <info@mixedenergy.dk>',
    to: 'victor@reipur.com', // Replace with the recipient's email
    subject: 'Orderbekræftelse',
    html: `<html>
      <body>
        <h1>Hello World</h1>
        <p>This is your order confirmation. from next js</p>
      </body>
    </html>`,
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