import { db } from '../../lib/firebase';

export default async function handler(req, res) {
  try {
    const snapshot = await db.collection('messages').get();
    const data = snapshot.docs.map(doc => doc.data());
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}
