// lib/api/session/createTemporarySelection.ts

import { supabaseAdmin } from '../supabaseAdmin';
import { calculatePrice } from '../priceCalculations';

interface CreateTempSelectionParams {
  sessionId: string;
  packageSlug: string;
  selectedSize: number;
  sugarPreference?: 'uden_sukker' | 'med_sukker' | 'alle';
  isMysteryBox?: boolean;
  /**
   * If the client wants to provide a custom selection, it can do so.
   * If omitted or empty, we do random picks if isMysteryBox=true.
   */
  selectedProducts?: Record<string, number>;
}

interface CreateTempSelectionResult {
  success: boolean;
  selectionId: string;

  // from price calculations
  pricePerPackage: number;
  recyclingFeePerPackage: number;
  originalTotalPrice: number;
}

/**
 * createTemporarySelection
 * 
 * 1) Loads the package + package_drinks + associated drinks from DB.
 * 2) If `isMysteryBox` (or no `selectedProducts`), picks random drinks from the package,
 *    filtering by `sugarPreference`.
 * 3) Calculates final price (discounts, recyclingFee, etc.).
 * 4) Stores everything in session.temporary_selections + returns it.
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
  if (!sessionId) throw new Error('Missing sessionId');
  if (!packageSlug || !selectedSize) {
    throw new Error('Missing packageSlug or selectedSize');
  }

  // 2) Load the package + drinks from DB
  //    so we can do random picks and have pricing data
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
          drink_id,
          drinks (
            slug,
            sale_price,
            recycling_fee,
            is_sugar_free
          )
        )
      `
    )
    .eq('slug', packageSlug)
    .single();

  if (pkgError) {
    throw new Error(`Error fetching package: ${pkgError.message}`);
  }
  if (!pkgRow) {
    throw new Error(`Invalid package slug: "${packageSlug}"`);
  }

  const joinedDrinks: Array<{
    slug: string;
    sale_price: number;
    recycling_fee?: number;
    is_sugar_free: boolean;
  }> = (pkgRow.package_drinks ?? []).map((pd: any) => pd.drinks);

  if (!joinedDrinks.length) {
    throw new Error(`No drinks linked to package "${packageSlug}".`);
  }

  // 3) If isMysteryBox or no selectedProducts => do random picks
  let finalSelectedProducts = { ...selectedProducts };
  if (isMysteryBox || Object.keys(selectedProducts).length === 0) {
    finalSelectedProducts = buildRandomSelection({
      joinedDrinks,
      selectedSize,
      sugarPreference,
    });
  }

  // 4) Confirm total items = selectedSize
  const totalItems = Object.values(finalSelectedProducts).reduce((sum, n) => sum + n, 0);
  if (totalItems !== selectedSize) {
    throw new Error(`Selected products total (${totalItems}) != selectedSize (${selectedSize}).`);
  }

  // 5) Build a "drinksData" object for price calculations
  //    Keyed by drinkSlug => { sale_price, recycling_fee, ... }
  const drinksData: Record<string, { sale_price: number; recycling_fee: number }> = {};
  for (const d of joinedDrinks) {
    drinksData[d.slug] = {
      sale_price: d.sale_price,
      recycling_fee: d.recycling_fee || 0,
    };
  }

  // 6) Convert package_sizes => .packages for calculatePrice
  const packageData = {
    ...pkgRow,
    packages: pkgRow.package_sizes || [],
  };

  // 7) Run price calculation
  const { pricePerPackage, recyclingFeePerPackage, originalTotalPrice } = await calculatePrice({
    packageData,
    selectedSize,
    selectedProducts: finalSelectedProducts,
    drinksData, // pass the prepared object
  });

  // 8) Retrieve the existing session row
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

  // 9) Build a key: "slug-size-sugarPref"
  const selectionKey = `${packageSlug}-${selectedSize}-${sugarPreference}`;
  const existingTempSelections = sessionRow.temporary_selections || {};

  // 10) Insert or overwrite
  existingTempSelections[selectionKey] = {
    selectedProducts: finalSelectedProducts,
    selectedSize,
    packageSlug,
    sugarPreference,
    isMysteryBox,
    createdAt: new Date().toISOString(),
    // Embed price data so the front end can read it from the session:
    priceData: {
      pricePerPackage,
      recyclingFeePerPackage,
      originalTotalPrice,
    },
  };

  // 11) Update the DB
  const { error: updateErr } = await supabaseAdmin
    .from('sessions')
    .update({ temporary_selections: existingTempSelections })
    .eq('session_id', sessionId);

  if (updateErr) {
    throw new Error(`Error updating session: ${updateErr.message}`);
  }

  // 12) Return the results
  return {
    success: true,
    selectionId: selectionKey,
    pricePerPackage,
    recyclingFeePerPackage,
    originalTotalPrice,
  };
}

/**
 * buildRandomSelection
 *  - filters by sugarPreference
 *  - picks exactly 'selectedSize' drinks
 */
function buildRandomSelection({
  joinedDrinks,
  selectedSize,
  sugarPreference,
}: {
  joinedDrinks: Array<{
    slug: string;
    sale_price: number;
    recycling_fee?: number;
    is_sugar_free: boolean;
  }>;
  selectedSize: number;
  sugarPreference: 'uden_sukker' | 'med_sukker' | 'alle';
}): Record<string, number> {
  // 1) Filter
  let filtered = joinedDrinks;
  if (sugarPreference === 'uden_sukker') {
    filtered = joinedDrinks.filter((d) => d.is_sugar_free);
  } else if (sugarPreference === 'med_sukker') {
    filtered = joinedDrinks.filter((d) => !d.is_sugar_free);
  }

  if (!filtered.length) {
    throw new Error(
      `No drinks match sugarPreference="${sugarPreference}" for this package.`
    );
  }

  // 2) Random picks
  const result: Record<string, number> = {};
  let remaining = selectedSize;
  while (remaining > 0) {
    const idx = Math.floor(Math.random() * filtered.length);
    const drinkSlug = filtered[idx].slug;
    result[drinkSlug] = (result[drinkSlug] || 0) + 1;
    remaining--;
  }

  return result;
}
