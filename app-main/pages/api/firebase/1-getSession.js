import { db } from '../../../lib/firebaseAdmin';
import cookie from 'cookie';

export default async function handler(req, res) {
  try {
    // Parse cookies from the request headers
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionId = cookies.session_id;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId in cookies' });
    }

    const docRef = db.collection('sessions').doc(sessionId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const data = docSnap.data();

    // Exclude fields that start with an underscore
    const filteredData = Object.keys(data)
      .filter(key => !key.startsWith('_'))
      .reduce((obj, key) => {
        obj[key] = data[key];
        return obj;
      }, {});

    // Return the filtered session data
    res.status(200).json({ session: filteredData });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}