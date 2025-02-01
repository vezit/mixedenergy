// pages/api/supabase/drinks/[slug].ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Ensure that the slug is a string
  const { slug } = req.query;
  if (typeof slug !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing slug' });
  }

  try {
    // Query the "drinks" table where slug equals the requested slug
    const { data, error } = await supabaseAdmin
      .from('drinks')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('Error fetching drink:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!data) {
      return res.status(404).json({ error: 'Drink not found' });
    }

    // Return the found drink row in a "drink" property
    return res.status(200).json({ drink: data });
  } catch (err) {
    console.error('Error in fetching drink:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
