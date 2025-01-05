// /pages/api/packages/[slug].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../lib/firebaseAdmin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const { slug } = req.query;

  // Ensure slug is a string
  if (typeof slug !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing slug' });
  }

  try {
    const packageRef = db.collection('packages').doc(slug);
    const packageDoc = await packageRef.get();

    if (!packageDoc.exists) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const data = packageDoc.data() || {};

    // Exclude fields that start with an underscore
    const filteredData = Object.keys(data).reduce((obj: Record<string, any>, key) => {
      if (!key.startsWith('_')) {
        obj[key] = data[key];
      }
      return obj;
    }, {});

    return res.status(200).json({
      package: { id: packageDoc.id, ...filteredData },
    });
  } catch (error) {
    console.error('Error fetching package:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
