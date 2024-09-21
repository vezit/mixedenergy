import { db } from '../../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { test } = req.body;
      const docRef = await addDoc(collection(db, 'helloworld'), { test });
      res.status(201).json({ id: docRef.id, message: 'Document written successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to write data to Firestore' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
