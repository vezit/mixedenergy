// pages/api/getDrinks.js

import { db } from '../../../lib/firebaseAdmin';

export default async (req, res) => {
  try {
    const drinksRef = db.collection('drinks');
    const snapshot = await drinksRef.get();

    // Define the fields to exclude
    const excludeFields = ['stock', 'salePrice', 'purchasePrice'];

    const drinks = {};
    snapshot.forEach((doc) => {
      const data = doc.data();

      // Exclude specified fields
      excludeFields.forEach((field) => {
        delete data[field];
      });

      drinks[doc.id] = data;
    });

    res.status(200).json({ drinks });
  } catch (error) {
    console.error('Error fetching drinks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
