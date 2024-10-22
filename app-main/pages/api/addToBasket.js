// /pages/api/addToBasket.js
import { db } from '../../lib/firebaseAdmin';
import { doc, setDoc, getDoc } from 'firebase-admin/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { consentId, basketItem } = req.body;

  if (!consentId || !basketItem) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  try {
    const docRef = db.collection('sessions_private').doc(consentId);
    const docSnap = await docRef.get();

    let basketItems = [];

    if (docSnap.exists) {
      const sessionData = docSnap.data();
      basketItems = sessionData.basketItems || [];
    }

    // Merge items if necessary
    basketItems.push(basketItem);

    await docRef.set({ basketItems }, { merge: true });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error adding to basket:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
