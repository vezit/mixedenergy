// lib/api/session/generateRandomSelection.ts

import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../supabaseAdmin';

/** Input parameters for generateRandomSelection. */
interface GenerateRandomSelectionParams {
  sessionId: string;
  slug: string;
  selectedSize: number;
  sugarPreference?: 'uden_sukker' | 'med_sukker' | 'alle';
  isCustomSelection?: boolean;
  selectedProducts?: Record<string, number>;
}

/** Return shape. */
interface GenerateRandomSelectionResult {
  success: boolean;
  selectedProducts: Record<string, number>;
  selectionId: string;
}

/**
 * generateRandomSelection
 *  - Either uses the provided "selectedProducts" (if isCustomSelection=true)
 *    or picks random drinks from the "package_drinks".
 *  - Merges the new selection into session.temporary_selections in DB.
 *  - Returns { success, selectedProducts, selectionId }.
 */
export async function generateRandomSelection(
  params: GenerateRandomSelectionParams
): Promise<GenerateRandomSelectionResult> {
  const {
    sessionId,
    slug,
    selectedSize,
    sugarPreference = 'alle',
    isCustomSelection = false,
    selectedProducts = {},
  } = params;

  // 1) Basic validation
  if (!sessionId || !slug || !selectedSize) {
    throw new Error('Missing required fields: sessionId, slug, or selectedSize.');
  }

  // 2) Fetch the package row with joined drinks (package_drinks -> drinks)
  //    So we can see which drinks are available for random selection
  const { data: pkgRow, error: pkgError } = await supabaseAdmin
    .from('packages')
    .select(
      `
      id,
      slug,
      package_drinks (
        drinks (
          slug,
          is_sugar_free
        )
      )
    `
    )
    .eq('slug', slug)
    .single();

  if (pkgError) {
    throw new Error(`Error fetching package: ${pkgError.message}`);
  }
  if (!pkgRow) {
    throw new Error(`Package not found for slug="${slug}".`);
  }

  // Flatten to an array of { slug, is_sugar_free }
  const joinedDrinks: Array<{ slug: string; is_sugar_free: boolean }> =
    (pkgRow.package_drinks || []).map((pd: any) => pd.drinks) || [];

  if (!joinedDrinks.length) {
    throw new Error(`No drinks linked to this package: slug="${slug}".`);
  }

  // 3) If isCustomSelection => just use the user-provided selectedProducts
  let finalSelectedProducts: Record<string, number> = {};
  if (isCustomSelection) {
    finalSelectedProducts = { ...selectedProducts };
  } else {
    // Otherwise, generate a random selection
    finalSelectedProducts = generateRandomSelectionHelper(
      joinedDrinks,
      selectedSize,
      sugarPreference
    );
  }

  // 4) Insert or merge into session.temporary_selections
  const { data: existingSession, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .select('temporary_selections')
    .eq('session_id', sessionId)
    .single();

  if (sessionError || !existingSession) {
    throw new Error(`Session not found in DB for session_id="${sessionId}"`);
  }

  // Create a new selectionId and merge into existing temporary_selections
  const selectionId = uuidv4();
  const tempSelections = existingSession.temporary_selections || {};

  tempSelections[selectionId] = {
    selectedProducts: finalSelectedProducts,
    sugarPreference,
    selectedSize,
    packageSlug: slug,
    isCustomSelection,
    createdAt: new Date().toISOString(),
  };

  // 5) Update DB
  const { error: updateError } = await supabaseAdmin
    .from('sessions')
    .update({ temporary_selections: tempSelections })
    .eq('session_id', sessionId);

  if (updateError) {
    throw new Error(`Error updating session with new selection: ${updateError.message}`);
  }

  // 6) Return success
  return {
    success: true,
    selectedProducts: finalSelectedProducts,
    selectionId,
  };
}

/** 
 * generateRandomSelectionHelper
 *   - Picks random drinks from the joinedDrinks array 
 *     until we have `selectedSize` items.
 */
function generateRandomSelectionHelper(
  allDrinks: { slug: string; is_sugar_free: boolean }[],
  selectedSize: number,
  sugarPreference: 'uden_sukker' | 'med_sukker' | 'alle'
): Record<string, number> {
  const filtered = filterDrinksBySugarPreference(allDrinks, sugarPreference);
  if (!filtered.length) {
    throw new Error(`No drinks match sugarPreference=${sugarPreference}.`);
  }

  const finalSelection: Record<string, number> = {};
  let remaining = selectedSize;

  while (remaining > 0) {
    const randomIndex = Math.floor(Math.random() * filtered.length);
    const { slug } = filtered[randomIndex];
    finalSelection[slug] = (finalSelection[slug] || 0) + 1;
    remaining--;
  }

  return finalSelection;
}

/**
 * Helper to filter drinks by sugar preference.
 */
function filterDrinksBySugarPreference(
  drinks: { slug: string; is_sugar_free: boolean }[],
  sugarPref: 'uden_sukker' | 'med_sukker' | 'alle'
) {
  if (sugarPref === 'uden_sukker') {
    return drinks.filter((d) => d.is_sugar_free);
  }
  if (sugarPref === 'med_sukker') {
    return drinks.filter((d) => !d.is_sugar_free);
  }
  return drinks; // sugarPref='alle'
}
