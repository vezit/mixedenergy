// pages/api/packages/[slug]/drinks.ts

import type { NextApiRequest, NextApiResponse } from 'next'; 
// ^ only if you're using TS. If JS, remove this line.
import { supabaseAdmin } from '../../../../lib/api/supabaseAdmin'; 
// Adjust path if needed

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { slug } = req.query;
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid package slug' });
    }

    // Attempt to use the "join" approach with Supabase, 
    // i.e., .select('drink_slug, drinks(*)')
    const { data, error } = await supabaseAdmin
      .from('packages_drinks')
      .select('drink_slug, drinks(*)')
      .eq('package_slug', slug);

    if (error) {
      console.error('[getPackageDrinks] supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Each row has: { drink_slug, drinks: { ...the drink row... } }
    const drinks = data?.map((row) => row.drinks) || [];

    // Return JSON array of drink objects
    return res.status(200).json({ slug, drinks });
  } catch (err: any) {
    console.error('[getPackageDrinks] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
