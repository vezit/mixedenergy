// pages/api/packages/[slug].js

import { db } from '../../../../lib/firebaseAdmin';

export default async (req, res) => {
  const { slug } = req.query;

  try {
    const packageRef = db.collection('packages').doc(slug);
    const packageDoc = await packageRef.get();

    if (!packageDoc.exists) {
      return res.status(404).json({ error: 'Package not found' });
    }



    const data = packageDoc.data();

    // Exclude fields that start with an underscore
    const filteredData = Object.keys(data)
      .filter(key => !key.startsWith('_'))
      .reduce((obj, key) => {
        obj[key] = data[key];
        return obj;
      }, {});

    res.status(200).json({ package: { id: packageDoc.id, ...filteredData } });
  } catch (error) {
    console.error('Error fetching package:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
