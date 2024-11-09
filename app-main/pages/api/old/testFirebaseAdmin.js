// pages/api/testFirebaseAdmin.js

import { db } from '../../../lib/firebaseAdmin';

export default async function handler(req, res) {
  console.log('Received request:', req.method, req.url);

  try {
    console.log('Attempting to read from Firestore...');
    const testDoc = await db.collection('sessions').doc('session1').get();
    
    if (!testDoc.exists) {
      console.log('Test document does not exist.');
      return res.status(200).json({ message: 'Firestore initialized successfully, but test document does not exist.' });
    }

    console.log('Test document found:', testDoc.data());
    res.status(200).json({ message: 'Firestore initialized successfully!', data: testDoc.data() });
  } catch (error) {
    console.error('Error accessing Firestore:', error);
    res.status(500).json({ message: 'Failed to access Firestore.', error: error.message });
  }
}