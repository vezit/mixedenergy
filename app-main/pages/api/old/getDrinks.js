// pages/api/getDrinks.js

import { db } from '../../../lib/firebaseAdmin';

export default async (req, res) => {
  try {
    const drinksRef = db.collection('drinks');
    const snapshot = await drinksRef.get();

    const drinks = {};
    snapshot.forEach((doc) => {
      const data = doc.data();

      // Exclude fields that start with an underscore
      const filteredData = Object.keys(data)
        .filter(key => !key.startsWith('_'))
        .reduce((obj, key) => {
          obj[key] = data[key];
          return obj;
        }, {});

      drinks[doc.id] = filteredData;
    });

    res.status(200).json({ drinks });
  } catch (error) {
    console.error('Error fetching drinks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};