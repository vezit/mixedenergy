// /pages/api/supabase/getDrinks.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  try {
    // Fetch all rows from the "drinks" table
    const { data: rows, error } = await supabaseAdmin
      .from('drinks')
      .select('*');

    if (error) {
      console.error('Error fetching drinks:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // Convert the array into a record keyed by slug (mimics Firestore's doc.id => doc.data)
    const drinks: Record<string, unknown> = {};
    for (const row of rows ?? []) {
      // Assume row.slug is the unique identifier
      drinks[row.slug] = row;
    }

    return res.status(200).json({ drinks });
  } catch (error) {
    console.error('Error fetching drinks:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
