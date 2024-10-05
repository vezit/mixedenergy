export default async function handler(req, res) {
  // Only allow POST requests to this endpoint
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Log the request body to check if the request is reaching the server
    console.log("Request received:", req.body);

    // Echo back the received request data (body and method)
    return res.status(200).json({
      message: 'Hello World!',
      method: req.method,
      body: req.body,
    });
  } catch (error) {
    // In case of any errors, return a 500 error response
    console.error('Error handling request:', error);
    return res.status(500).json({ message: 'Internal Server Error', error });
  }
}
