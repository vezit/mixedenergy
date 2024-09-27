// app-main/pages/api/admin/uploadData.js

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end(); // Method Not Allowed
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Ensure the user is an admin
    if (decodedToken.email !== 'management@mixedenergy.dk') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { data, dataType } = req.body;

    if (!['drinks', 'packages'].includes(dataType)) {
      res.status(400).json({ error: 'Invalid data type' });
      return;
    }

    // Delete existing data
    const collectionRef = db.collection(dataType);
    const snapshot = await collectionRef.get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Write new data
    const batchWrite = db.batch();
    for (const [id, docData] of Object.entries(data)) {
      const docRef = collectionRef.doc(id);
      batchWrite.set(docRef, docData);
    }
    await batchWrite.commit();

    res.status(200).json({ message: 'Data updated successfully' });
  } catch (error) {
    console.error('Error in uploadData API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
