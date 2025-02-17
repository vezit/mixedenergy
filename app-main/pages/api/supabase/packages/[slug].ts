import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../lib/api/supabaseAdmin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug } = req.query;
  console.log('[packages/[slug]] Handler called with slug =', slug);

  if (typeof slug !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid slug' });
  }

  try {
    // 1) Fetch the package row by slug
    //    Also grab linked package_sizes & package_drinks => drinks
    const { data: pkgRow, error } = await supabaseAdmin
      .from('packages')
      .select(`
        id,
        slug,
        title,
        description,
        image,
        category,
        package_sizes (
          size,
          discount,
          round_up_or_down
        ),
        package_drinks (
          drinks (
            slug,
            is_sugar_free
          )
        )
      `)
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('[packages/[slug]] Error fetching package:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!pkgRow) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // 2) Transform "package_sizes" => an array "packages"
    const packagesArray =
      pkgRow.package_sizes?.map((sz: any) => ({
        size: sz.size,
        discount: sz.discount,
        roundUpOrDown: sz.round_up_or_down,
      })) ?? [];

    // 3) Transform "package_drinks" => a simple array "collectionsDrinks"
    //    each item is the drink's slug
    const collectionsDrinks =
      pkgRow.package_drinks?.map((pd: any) => pd.drinks.slug) ?? [];

    // 4) Return in the shape your frontend expects
    return res.status(200).json({
      package: {
        slug: pkgRow.slug,
        title: pkgRow.title,
        description: pkgRow.description,
        image: pkgRow.image,
        category: pkgRow.category,
        packages: packagesArray,
        collectionsDrinks,
      },
    });
  } catch (err) {
    console.error('[packages/[slug]] Catch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
