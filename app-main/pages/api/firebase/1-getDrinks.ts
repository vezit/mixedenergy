// /pages/api/firebase/1-getDrinks.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/firebaseAdmin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  try {
    const drinksSnapshot = await db.collection('drinks').get();
    const drinks: Record<string, unknown> = {};

    drinksSnapshot.forEach((doc) => {
      drinks[doc.id] = doc.data();
    });

    return res.status(200).json({ drinks });
  } catch (error) {
    console.error('Error fetching drinks:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
