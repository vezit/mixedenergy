// pages/api/firebase/drinks/[slug].js

import { db } from '../../../../lib/firebaseAdmin';

export default async (req, res) => {
  const { slug } = req.query;

  if (!slug) {
    return res.status(400).json({ error: 'No slug provided' });
  }

  try {
    const drinkDoc = await db.collection('drinks').doc(slug).get();
    if (!drinkDoc.exists) {
      return res.status(404).json({ error: 'Drink not found' });
    }

    const drinkData = drinkDoc.data();
    res.status(200).json({ drink: drinkData });
  } catch (error) {
    console.error('Error fetching drink:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
