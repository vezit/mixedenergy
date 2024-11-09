// pages/api/drinks/[slug].js

import { db } from '../../../../../lib/firebaseAdmin';



export default async (req, res) => {
  const { slug } = req.query;

  try {
    const drinkRef = db.collection('drinks').doc(slug);
    const drinkDoc = await drinkRef.get();

    if (!drinkDoc.exists) {
      return res.status(404).json({ error: 'Drink not found' });
    }

    const excludeFields = ['stock', 'salePrice', 'purchasePrice'];
    const data = drinkDoc.data();

    // Exclude specified fields
    excludeFields.forEach((field) => {
      delete data[field];
    });

    res.status(200).json({ drink: { id: drinkDoc.id, ...data } });
  } catch (error) {
    console.error('Error fetching drink:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
