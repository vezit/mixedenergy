// lib/api/session/createTemporarySelection.ts

import { supabaseAdmin } from '../supabaseAdmin';

// In your older code, you had a separate file priceCalculations.ts
// We'll integrate that logic here inline for simplicity.

/** Input parameters. */
interface CreateTempSelectionParams {
  sessionId: string;
  packageSlug: string; // e.g. "mixed-boosters"
  selectedSize: number; // e.g. 12
  sugarPreference?: 'uden_sukker' | 'med_sukker' | 'alle';
  isMysteryBox?: boolean;
  /**
   * If the user wants to provide a custom selection. If omitted or empty,
   * we do random picks if isMysteryBox = true.
   */
  selectedProducts?: Record<string, number>;
}

interface CreateTempSelectionResult {
  success: boolean;
  selectionId: string;

  // from inline price calculations
  pricePerPackage: number;
  recyclingFeePerPackage: number;
  originalTotalPrice: number;
}

/**
 * createTemporarySelection
 *  - Loads package+drinks from DB (package_sizes -> discount/rounding, package_drinks -> drinks).
 *  - If isMysteryBox or no selectedProducts => randomly pick drinks from DB, filtered by sugarPreference.
 *  - Calculates final price, discount, rounding, recycling fee, etc.
 *  - Stores the selection (including price data) in session.temporary_selections under a key
 *    "packageSlug-selectedSize-sugarPreference".
 *  - Returns final price & selection key.
 */
export async function createTemporarySelection(
  params: CreateTempSelectionParams
): Promise<CreateTempSelectionResult> {
  const {
    sessionId,
    packageSlug,
    selectedSize,
    sugarPreference = 'alle',
    isMysteryBox = false,
    selectedProducts = {},
  } = params;

  // 1) Basic checks
  if (!sessionId) {
    throw new Error('Missing sessionId');
  }
  if (!packageSlug || !selectedSize) {
    throw new Error('Missing packageSlug or selectedSize');
  }

  // 2) Fetch the package row from Supabase, including:
  //    - package_sizes => discount, round_up_or_down
  //    - package_drinks => fetch associated drinks
  //      each drink => slug, sale_price, recycling_fee, is_sugar_free, etc.
  const { data: pkgRow, error: pkgError } = await supabaseAdmin
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
          sale_price,
          recycling_fee,
          is_sugar_free
        )
      )
    `)
    .eq('slug', packageSlug)
    .single();

  if (pkgError) {
    throw new Error(`Error fetching package: ${pkgError.message}`);
  }
  if (!pkgRow) {
    throw new Error(`Invalid package slug: "${packageSlug}"`);
  }

  // Flatten the joined drinks
  const joinedDrinks: Array<{
    slug: string;
    sale_price: number;
    recycling_fee?: number;
    is_sugar_free: boolean;
  }> = (pkgRow.package_drinks || []).map((pd: any) => pd.drinks);

  if (!joinedDrinks.length) {
    throw new Error(`No drinks linked to package "${packageSlug}".`);
  }

  // 3) If isMysteryBox or no selectedProducts => build a random selection
  let finalSelectedProducts = { ...selectedProducts };
  if (isMysteryBox || Object.keys(selectedProducts).length === 0) {
    finalSelectedProducts = buildRandomSelection(joinedDrinks, selectedSize, sugarPreference);
  }

  // confirm the total items matches selectedSize
  const totalItems = Object.values(finalSelectedProducts).reduce((sum, n) => sum + n, 0);
  if (totalItems !== selectedSize) {
    throw new Error(`Selected products total (${totalItems}) != selectedSize (${selectedSize}).`);
  }

  // 4) Build a map of drinks for price calculations
  //    e.g. { slug: { sale_price, recycling_fee } }
  const drinksData: Record<string, { sale_price: number; recycling_fee: number }> = {};
  for (const d of joinedDrinks) {
    drinksData[d.slug] = {
      sale_price: d.sale_price,
      recycling_fee: d.recycling_fee || 0,
    };
  }

  // 5) Find the matching "package_sizes" row for the discount & rounding
  const packageOption = (pkgRow.package_sizes || []).find(
    (ps: any) => ps.size === selectedSize
  );
  if (!packageOption) {
    throw new Error(`No package_sizes entry found for size=${selectedSize} on "${packageSlug}".`);
  }
  const discountMultiplier = packageOption.discount || 1; // e.g. 0.95 => 5% discount
  const roundTo = packageOption.round_up_or_down ?? 5;    // e.g. nearest 5 kr

  // 6) Calculate the total base price & recycling fee
  let totalDrinkPrice = 0;
  let totalRecyclingFee = 0;
  for (const [drinkSlug, qty] of Object.entries(finalSelectedProducts)) {
    const d = drinksData[drinkSlug];
    if (!d) {
      throw new Error(`Drink not found in package: slug="${drinkSlug}"`);
    }
    totalDrinkPrice += d.sale_price * qty;
    totalRecyclingFee += d.recycling_fee * qty;
  }

  // 7) Apply discount
  let discountedPrice = totalDrinkPrice * discountMultiplier;

  // 8) Round to nearest multiple of "roundTo" in KR (100 øre = 1 kr)
  // E.g. if roundTo=5 => nearest 5 kr
  // Convert discountedPrice to float # of KR, then multiply back
  discountedPrice = Math.ceil(discountedPrice / (roundTo * 100)) * (roundTo * 100);

  const pricePerPackage = Math.round(discountedPrice);  // final integer in øre
  const recyclingFeePerPackage = totalRecyclingFee;     // not discounted

  // 9) Retrieve the session row for existing "temporary_selections"
  const { data: sessionRow, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .select('temporary_selections')
    .eq('session_id', sessionId)
    .single();

  if (sessionError) {
    throw new Error(`Session fetch error: ${sessionError.message}`);
  }
  if (!sessionRow) {
    throw new Error(`Session not found for session_id="${sessionId}"`);
  }

  // 10) Build the key => e.g. "mixed-boosters-12-alle"
  const selectionKey = `${packageSlug}-${selectedSize}-${sugarPreference}`;
  const existingTempSelections = sessionRow.temporary_selections || {};

  // 11) Insert/overwrite this selection in the JSON
  existingTempSelections[selectionKey] = {
    selectedProducts: finalSelectedProducts,
    selectedSize,
    packageSlug,
    sugarPreference,
    isMysteryBox,
    createdAt: new Date().toISOString(),
    // Add pricing info so the client can see it
    priceData: {
      pricePerPackage,
      recyclingFeePerPackage,
      originalTotalPrice: totalDrinkPrice,
    },
  };

  // 12) Update the DB
  const { error: updateErr } = await supabaseAdmin
    .from('sessions')
    .update({ temporary_selections: existingTempSelections })
    .eq('session_id', sessionId);

  if (updateErr) {
    throw new Error(`Error updating session: ${updateErr.message}`);
  }

  // 13) Return the final results
  return {
    success: true,
    selectionId: selectionKey,
    pricePerPackage,
    recyclingFeePerPackage,
    originalTotalPrice: totalDrinkPrice,
  };
}

/**
 * buildRandomSelection
 *  - filters joinedDrinks by sugarPreference, then picks exactly selectedSize items
 */
function buildRandomSelection(
  joinedDrinks: Array<{
    slug: string;
    sale_price: number;
    recycling_fee?: number;
    is_sugar_free: boolean;
  }>,
  selectedSize: number,
  sugarPreference: 'uden_sukker' | 'med_sukker' | 'alle'
): Record<string, number> {
  // Filter
  let filtered = joinedDrinks;
  if (sugarPreference === 'uden_sukker') {
    filtered = filtered.filter((d) => d.is_sugar_free);
  } else if (sugarPreference === 'med_sukker') {
    filtered = filtered.filter((d) => !d.is_sugar_free);
  }

  if (!filtered.length) {
    throw new Error(`No drinks match sugarPreference="${sugarPreference}" in this package.`);
  }

  const final: Record<string, number> = {};
  let remaining = selectedSize;

  while (remaining > 0) {
    const randIndex = Math.floor(Math.random() * filtered.length);
    const { slug } = filtered[randIndex];
    final[slug] = (final[slug] || 0) + 1;
    remaining--;
  }

  return final;
}
