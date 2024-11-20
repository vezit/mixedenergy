// pages/api/firebase/1-getDrinks.js

import { db } from '../../../lib/firebaseAdmin';

export default async (req, res) => {
  try {
    const drinksSnapshot = await db.collection('drinks').get();
    const drinks = {};
    drinksSnapshot.forEach((doc) => {
      drinks[doc.id] = doc.data();
    });
    res.status(200).json({ drinks });
  } catch (error) {
    console.error('Error fetching drinks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
