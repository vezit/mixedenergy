// /pages/api/firebase/drinks/[slug].ts
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
    const drinkDoc = await db.collection('drinks').doc(slug).get();
    if (!drinkDoc.exists) {
      return res.status(404).json({ error: 'Drink not found' });
    }

    const drinkData = drinkDoc.data();
    return res.status(200).json({ drink: drinkData });
  } catch (error) {
    console.error('Error fetching drink:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
