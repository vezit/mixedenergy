// /pages/api/supabase/testRelations.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

/**
 * Example endpoint that demonstrates a relational query:
 * - SELECT from "packages"
 * - Join "packages_drinks"
 * - Join "drinks"
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('--- testRelations: ENTERED HANDLER ---');

  try {
    // 1) Check method
    if (req.method !== 'GET') {
      console.warn('testRelations: method not allowed:', req.method);
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
    console.log('testRelations: method is GET');

    // 2) Check if supabaseAdmin is set up
    console.log('testRelations: supabase URL is', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('testRelations: service role key is', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'DEFINED' : 'UNDEFINED');

    // 3) Attempt the nested .select() query
    console.log('testRelations: about to do supabase query for packages, with nested packages_drinks/drinks...');
    const { data: packageData, error } = await supabaseAdmin
      .from('packages')
      .select(`
        slug,
        title,
        packages_drinks (
          drink_slug,
          drinks ( name )
        )
      `);

    // If there's a query error, log it
    if (error) {
      console.error('testRelations: DB join error:', error);
      return res.status(500).json({ error: 'Database join error', details: error });
    }

    console.log('testRelations: packageData length =', packageData?.length ?? 0);

    // 4) Flatten the nested result
    const flattened = [];
    for (const pkg of packageData || []) {
      // If there's no packages_drinks array, use empty
      const joinRows = pkg.packages_drinks || [];
      for (const row of joinRows) {
        const drinkName = row.drinks?.[0]?.name || '(No name)';
        flattened.push({
          package_slug: pkg.slug,
          package_title: pkg.title,
          drink_slug: row.drink_slug,
          drink_name: drinkName,
        });
      }
    }

    console.log('testRelations: returning flattened data, length =', flattened.length);

    // 5) Return final flattened array
    return res.status(200).json({ data: flattened });
  } catch (error) {
    console.error('testRelations: Caught top-level error:', error);
    return res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}
