// pages/api/supabase/getDrinks.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/api/supabaseAdmin';

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

    // Convert the array into an object keyed by slug
    const drinks: Record<string, unknown> = {};
    if (rows) {
      for (const row of rows) {
        if (row.slug) {  // ensure that the row has a slug
          drinks[row.slug] = row;
        }
      }
    }

    // Always return an object with a "drinks" property (even if empty)
    return res.status(200).json({ drinks });
  } catch (error) {
    console.error('Error fetching drinks:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
