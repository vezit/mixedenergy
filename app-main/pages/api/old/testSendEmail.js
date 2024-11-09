// pages/api/testSendEmail.js

import { sendOrderConfirmation } from '../../../lib/email';

export default async function handler(req, res) {
  // Verify the secret key for security
  const { secret } = req.query;
  if (secret !== process.env.SECRET_INCOMING_MAIL_PARAMETER) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  // Define test email and order data
  const testEmail = 'mixedenergy.dk@gmail.com';
  const testOrderData = {
    customerDetails: {
      fullName: 'Test User',
    },
    orderId: '123456',
    basketItems: [
      { title: 'Product 1', quantity: 1, price: 1000 },
      { title: 'Product 2', quantity: 2, price: 2000 },
    ],
  };

  // Attempt to send the email
  try {
    const success = await sendOrderConfirmation(testEmail, testOrderData);

    if (success) {
      return res.status(200).json({ message: 'Test email sent successfully' });
    } else {
      return res.status(500).json({ message: 'Failed to send test email' });
    }
  } catch (error) {
    console.error('Error in testSendEmail handler:', error);
    return res.status(500).json({ message: 'Error occurred while sending email' });
  }
}
