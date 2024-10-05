export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.warn(`Method ${req.method} not allowed on /api/inbound-email`);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Directly parse JSON data from the request body
    const { timestamp, token, signature, sender, recipient, subject, 'body-plain': bodyPlain } = req.body;

    console.log('Received data:', req.body);

    // Check that essential fields are present
    if (!timestamp || !token || !signature || !sender || !recipient || !subject || !bodyPlain) {
      console.error('Missing required fields');
      return res.status(400).json({ message: 'Bad Request: Missing required fields' });
    }

    // For now, just respond with the data we received to confirm it's coming through
    return res.status(200).json({
      message: 'Email data received successfully',
      data: {
        timestamp,
        token,
        signature,
        sender,
        recipient,
        subject,
        bodyPlain,
      },
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
