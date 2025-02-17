// lib/api/session/getCalculatedPackagePrice.ts

import { supabaseAdmin } from '../supabaseAdmin';
import { calculatePrice } from '../priceCalculations';

/** Input interface for calculating package price. */
interface GetCalcPriceParams {
  slug: string;
  selectedSize: number;
  selectedProducts?: Record<string, number>;
  isMysteryBox?: boolean;
  sugarPreference?: 'alle' | 'med_sukker' | 'uden_sukker';
}

/** Output interface returned by getCalculatedPackagePrice. */
interface GetCalcPriceResult {
  pricePerPackage: number;
  recyclingFeePerPackage: number;
  originalTotalPrice: number;
}

/**
 * getCalculatedPackagePrice
 *  - Fetches package + drinks data from DB
 *  - (Optionally) randomizes the selectedProducts if isMysteryBox = true
 *  - Calls calculatePrice(...) to compute final price and recycling fee
 */
export async function getCalculatedPackagePrice(
  params: GetCalcPriceParams
): Promise<GetCalcPriceResult> {
  const {
    slug,
    selectedSize,
    selectedProducts = {},
    isMysteryBox = false,
    sugarPreference = 'alle',
  } = params;

  if (!slug || !selectedSize) {
    throw new Error('Missing required fields "slug" or "selectedSize"');
  }

  // 1) Fetch the package row from "packages" with its package_sizes + package_drinks
  const { data: pkgRow, error: pkgError } = await supabaseAdmin
    .from('packages')
    .select(
      `
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
      `
    )
    .eq('slug', slug)
    .single();

  if (pkgError) {
    throw new Error(`Supabase error fetching package: ${pkgError.message}`);
  }
  if (!pkgRow) {
    throw new Error(`Package not found for slug "${slug}"`);
  }

  // 2) Fetch the drinks details (since package_drinks only gives us drink_id)
  const drinkIds = (pkgRow.package_drinks || []).map((pd: any) => pd.drink_id);
  const { data: drinkRows, error: drinkError } = await supabaseAdmin
    .from('drinks')
    .select('slug, sale_price, recycling_fee, purchase_price, is_sugar_free')
    .in('id', drinkIds);

  if (drinkError) {
    throw new Error(`Error fetching drinks: ${drinkError.message}`);
  }
  if (!drinkRows || drinkRows.length === 0) {
    throw new Error(`No drinks found for package slug "${slug}"`);
  }

  // 3) Transform "package_sizes" into a .packages array for calculatePrice
  const packageData = {
    ...pkgRow,
    packages: (pkgRow.package_sizes ?? []).map((ps: any) => ({
      size: ps.size,
      discount: ps.discount,
      roundUpOrDown: ps.round_up_or_down,
    })),
  };

  // 4) Build drinksData for easy lookup in calculatePrice
  const drinksData: Record<string, any> = {};
  for (const d of drinkRows) {
    drinksData[d.slug] = d;
  }

  // 5) If isMysteryBox => randomly pick from the available drinks matching sugarPref
  let finalSelectedProducts = { ...selectedProducts };
  if (isMysteryBox) {
    const filteredDrinks = filterDrinksBySugarPreference(drinkRows, sugarPreference);

    if (!filteredDrinks.length) {
      throw new Error(`No drinks match sugarPreference="${sugarPreference}" for package "${slug}".`);
    }

    // Simple random distribution
    finalSelectedProducts = {};
    for (let i = 0; i < selectedSize; i++) {
      const randIdx = Math.floor(Math.random() * filteredDrinks.length);
      const randomSlug = filteredDrinks[randIdx].slug;
      finalSelectedProducts[randomSlug] = (finalSelectedProducts[randomSlug] || 0) + 1;
    }
  }

  // 6) Compute price + recycling fees
  const {
    pricePerPackage,
    recyclingFeePerPackage,
    originalTotalPrice,
  } = await calculatePrice({
    packageData,
    selectedSize,
    selectedProducts: finalSelectedProducts,
    drinksData,
  });

  return {
    pricePerPackage,
    recyclingFeePerPackage,
    originalTotalPrice,
  };
}

/**
 * Filters an array of drinks by sugar preference.
 *  - 'uden_sukker' => return only is_sugar_free == true
 *  - 'med_sukker' => return only is_sugar_free == false
 *  - 'alle' => return all
 */
function filterDrinksBySugarPreference(
  drinkRows: Array<{ slug: string; is_sugar_free: boolean }>,
  sugarPreference: 'alle' | 'med_sukker' | 'uden_sukker'
) {
  if (sugarPreference === 'uden_sukker') {
    return drinkRows.filter((d) => d.is_sugar_free);
  }
  if (sugarPreference === 'med_sukker') {
    return drinkRows.filter((d) => !d.is_sugar_free);
  }
  return drinkRows; // 'alle'
}
