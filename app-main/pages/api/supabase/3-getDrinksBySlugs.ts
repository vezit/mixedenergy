// pages/api/supabase/getDrinksBySlugs.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { filterData } from '../../../lib/filterData';

interface RequestBody {
  slugs: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Must be POST or whichever method you prefer
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { slugs } = req.body as RequestBody;

    // Validate input
    if (!slugs || !Array.isArray(slugs)) {
      return res
        .status(400)
        .json({ error: 'Invalid request, "slugs" must be an array' });
    }

    // Query all drinks where slug is in slugs[]
    const { data: rows, error } = await supabaseAdmin
      .from('drinks')
      .select('*')
      .in('slug', slugs);

    if (error) {
      console.error('Error fetching drinks:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // Build an object keyed by slug
    const drinks: Record<string, unknown> = {};
    (rows ?? []).forEach((row) => {
      // Apply filterData to remove underscore fields, etc.
      const filteredData = filterData(row, Infinity);
      // For example, assume row.slug is the slug
      drinks[row.slug as string] = filteredData;
    });

    // Return the aggregated drinks object
    return res.status(200).json({ drinks });
  } catch (error) {
    console.error('Error fetching drinks:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
