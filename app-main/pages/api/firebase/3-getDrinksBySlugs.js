// pages/api/getDrinksBySlugs.js

import { db } from '../../../lib/firebaseAdmin';

export default async (req, res) => {
  const { slugs } = req.body;

  if (!slugs || !Array.isArray(slugs)) {
    return res.status(400).json({ error: 'Invalid request, slugs must be an array' });
  }

  try {
    const drinks = {};

    const drinkRefs = slugs.map((slug) => db.collection('drinks').doc(slug));
    const drinkDocs = await db.getAll(...drinkRefs);

    drinkDocs.forEach((doc) => {
      if (doc.exists) {
        const data = doc.data();
        const filteredData = Object.keys(data)
          .filter(key => !key.startsWith('_'))
          .reduce((obj, key) => {
            obj[key] = data[key];
            return obj;
          }, {});
        drinks[doc.id] = filteredData;
      }
    });

    res.status(200).json({ drinks });
  } catch (error) {
    console.error('Error fetching drinks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};