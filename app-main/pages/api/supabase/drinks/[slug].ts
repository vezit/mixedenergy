// /pages/api/supabase/drinks/[slug].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

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
    // Query the "drinks" table where slug = the requested slug
    const { data: drink, error } = await supabaseAdmin
      .from('drinks')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('Error fetching drink:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!drink) {
      return res.status(404).json({ error: 'Drink not found' });
    }

    // Return the found drink row
    return res.status(200).json({ drink });
  } catch (error) {
    console.error('Error fetching drink:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
