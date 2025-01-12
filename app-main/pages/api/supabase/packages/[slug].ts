// /pages/api/supabase/packages/[slug].ts
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
    // 1) Fetch the row from "packages" table
    const { data: pkgRow, error } = await supabaseAdmin
      .from('packages')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('Error fetching package:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!pkgRow) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // 2) Exclude fields that start with an underscore
    const filteredData = Object.keys(pkgRow).reduce<Record<string, any>>((acc, key) => {
      if (!key.startsWith('_')) {
        acc[key] = pkgRow[key];
      }
      return acc;
    }, {});

    // Provide an "id" property consistent with your Firestore version.
    // If you want to keep the same naming, use slug as the "id".
    return res.status(200).json({
      package: {
        id: pkgRow.slug, // or pkgRow.id if your table has an actual "id" column
        ...filteredData,
      },
    });
  } catch (error) {
    console.error('Error fetching package:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
