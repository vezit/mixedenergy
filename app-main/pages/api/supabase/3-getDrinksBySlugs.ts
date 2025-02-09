import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/api/supabaseAdmin';
import { filterData } from '../../../lib/filterData'; // your own function

interface RequestBody {
  slugs: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('[getDrinksBySlugs] Called, method =', req.method);

  try {
    // Must be POST
    if (req.method !== 'POST') {
      console.log('[getDrinksBySlugs] Method not allowed:', req.method);
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { slugs } = req.body as RequestBody;
    console.log('[getDrinksBySlugs] Received slugs:', slugs);

    // Validate input
    if (!slugs || !Array.isArray(slugs) || slugs.length === 0) {
      return res
        .status(400)
        .json({ error: 'Invalid request, "slugs" must be a non-empty array' });
    }

    // Query all drinks where slug is in slugs[]
    const { data: rows, error } = await supabaseAdmin
      .from('drinks')
      .select('*')
      .in('slug', slugs);

    if (error) {
      console.error('[getDrinksBySlugs] Error fetching drinks:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!rows || rows.length === 0) {
      console.log('[getDrinksBySlugs] No drinks found for slugs:', slugs);
      return res.status(200).json({ drinks: {} });
    }

    // Build an object keyed by slug
    const drinks: Record<string, unknown> = {};
    for (const row of rows) {
      // filterData removes underscores, etc.
      const filtered = filterData ? filterData(row, Infinity) : row;
      drinks[row.slug as string] = filtered;
    }

    // Return the aggregated drinks object
    console.log('[getDrinksBySlugs] Returning drinks keys =', Object.keys(drinks));
    return res.status(200).json({ drinks });
  } catch (error) {
    console.error('[getDrinksBySlugs] Catch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
