// /pages/api/supabase/getPackages.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { filterData } from '../../../lib/filterData';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Fetch rows from "packages" table
    const { data: packageRows, error } = await supabaseAdmin
      .from('packages')
      .select('*');

    if (error) {
      throw error;
    }

    // Transform each row with filterData
    const packages = (packageRows || []).map((pkg: any) => {
      // filterData might remove or transform underscored fields
      const filtered = filterData(pkg, 1);

      // Provide an "id" if your frontend expects it.
      // If slug is your PK, use slug as id. Otherwise, adjust as needed.
      return { id: pkg.slug, ...filtered };
    });

    return res.status(200).json({ packages });
  } catch (err: any) {
    console.error('Error fetching packages:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
