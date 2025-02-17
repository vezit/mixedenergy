// pages/api/supabase/3-getCalculatedPackagePrice.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/api/supabaseAdmin';
import { calculatePrice } from '../../../lib/api/priceCalculations';

interface BodyParams {
  selectedProducts?: Record<string, number>;
  selectedSize: number;
  slug: string;
  isMysteryBox?: boolean;
  sugarPreference?: 'alle' | 'med_sukker' | 'uden_sukker';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[3-getCalculatedPackagePrice] Called, method=', req.method);

  if (req.method !== 'POST') {
    console.log('[3-getCalculatedPackagePrice] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1) Parse request body
    const {
      selectedProducts = {},
      selectedSize,
      slug,
      isMysteryBox = false,
      sugarPreference = 'alle',
    } = req.body as BodyParams;

    console.log('[3-getCalculatedPackagePrice] Body received:', req.body);

    if (!slug || !selectedSize) {
      console.log('[3-getCalculatedPackagePrice] Missing slug or selectedSize');
      return res.status(400).json({
        error: 'Missing slug or selectedSize in POST body.',
      });
    }

    // 2) Fetch the package row from "packages" with its drinks & sizes
    const { data: pkgRow, error: pkgError } = await supabaseAdmin
      .from('packages')
      .select(`
        id,
        slug,
        title,
        description,
        category,
        image,
        package_sizes (
          size,
          discount,
          round_up_or_down
        ),
        package_drinks (
          drink_id
        )
      `)
      .eq('slug', slug)
      .single();

    if (pkgError) {
      console.error('[3-getCalculatedPackagePrice] Supabase error:', pkgError);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!pkgRow) {
      console.log('[3-getCalculatedPackagePrice] No package found for slug:', slug);
      return res.status(404).json({ error: 'Package not found' });
    }

    // 3) Fetch the drinks details (since package_drinks only gives us drink_id)
    const drinkIds = pkgRow.package_drinks.map((pd: any) => pd.drink_id);
    const { data: drinkRows, error: drinkError } = await supabaseAdmin
      .from('drinks')
      .select('slug, sale_price, recycling_fee, purchase_price, is_sugar_free')
      .in('id', drinkIds);

    if (drinkError) {
      console.error('[3-getCalculatedPackagePrice] Supabase drinks error:', drinkError);
      return res.status(500).json({ error: 'Error fetching drinks' });
    }
    if (!drinkRows || drinkRows.length === 0) {
      console.log('[3-getCalculatedPackagePrice] No drinks found for package:', slug);
      return res.status(404).json({ error: 'No drinks found for this package' });
    }

    // 4) Transform "package_sizes" into a .packages array
    const packageData = {
      ...pkgRow,
      packages: (pkgRow.package_sizes ?? []).map((ps: any) => ({
        size: ps.size,
        discount: ps.discount,
        roundUpOrDown: ps.round_up_or_down,
      })),
    };

    // 5) Build drinksData (for easy lookup by slug)
    const drinksData: Record<string, any> = {};
    for (const d of drinkRows) {
      drinksData[d.slug] = d;
    }

    // 6) If isMysteryBox => randomly pick from drinks
    let productsToCalculate = { ...selectedProducts };
    if (isMysteryBox) {
      console.log('[3-getCalculatedPackagePrice] MysteryBox => generating random selection');

      // Filter based on sugar preference
      let filteredDrinks = drinkRows;
      if (sugarPreference === 'uden_sukker') {
        filteredDrinks = drinkRows.filter((d) => d.is_sugar_free);
      } else if (sugarPreference === 'med_sukker') {
        filteredDrinks = drinkRows.filter((d) => !d.is_sugar_free);
      }
      if (!filteredDrinks.length) {
        console.log('[3-getCalculatedPackagePrice] No drinks match sugarPref:', sugarPreference);
        return res.status(404).json({
          error: `No drinks match sugarPreference='${sugarPreference}' for this package.`,
        });
      }

      // Pick drinks randomly until we reach selectedSize
      productsToCalculate = {};
      for (let i = 0; i < selectedSize; i++) {
        const randomIndex = Math.floor(Math.random() * filteredDrinks.length);
        const randomSlug = filteredDrinks[randomIndex].slug;
        productsToCalculate[randomSlug] = (productsToCalculate[randomSlug] || 0) + 1;
      }
      console.log('[3-getCalculatedPackagePrice] Mystery selection =', productsToCalculate);
    }

    // 7) Call calculatePrice
    console.log('[3-getCalculatedPackagePrice] Calling calculatePrice with:', {
      selectedSize,
      selectedProducts: productsToCalculate,
    });

    const { pricePerPackage, recyclingFeePerPackage, originalTotalPrice } = await calculatePrice({
      packageData,
      selectedSize,
      selectedProducts: productsToCalculate,
      drinksData, // Pass the properly mapped drinks
    });

    console.log('[3-getCalculatedPackagePrice] Price result:', {
      pricePerPackage,
      recyclingFeePerPackage,
      originalTotalPrice,
    });

    // 8) Return success
    return res.status(200).json({
      price: pricePerPackage,
      recyclingFeePerPackage,
      originalPrice: originalTotalPrice,
    });
  } catch (err: any) {
    console.error('[3-getCalculatedPackagePrice] Catch error:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error',
    });
  }
}
