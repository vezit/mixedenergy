// pages/api/hello.js

import admin from '../../lib/firebaseAdmin';

export default async function handler(req, res) {
  try {
    // Example: Write data to Firestore
    const db = admin.firestore();
    const docRef = db.collection('messages').doc('hello-world');
    await docRef.set({ message: 'Hello, world!' });

    // Example: Read data from Firestore
    const doc = await docRef.get();
    const data = doc.data();

    res.status(200).json({ data });
  } catch (error) {
    console.error('Error accessing Firebase:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
