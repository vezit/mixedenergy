// lib/api/session/createTemporarySelection.ts

import { supabaseAdmin } from '../supabaseAdmin';
import { calculatePrice } from '../priceCalculations';

/** Input parameters. */
interface CreateTempSelectionParams {
  sessionId: string;
  selectedProducts: Record<string, number>;
  selectedSize: number;
  packageSlug: string;
  isMysteryBox?: boolean;
  sugarPreference?: string;
}

/** Return shape. */
interface CreateTempSelectionResult {
  success: boolean;

  /**
   * The deterministic key used as the "selectionId" in your temporary_selections object.
   * e.g. "mixed-boosters-12-alle"
   */
  selectionId: string;

  pricePerPackage: number;
  recyclingFeePerPackage: number;
}

/**
 * createTemporarySelection
 *  - Validates that the user-specified `selectedProducts` matches `selectedSize`
 *  - Fetches the package from DB
 *  - Calls `calculatePrice` to get the per-package + recycling fee
 *  - Stores this selection into session.temporary_selections
 *    at a deterministic key: "packageSlug-selectedSize-sugarPreference"
 *  - Returns { success, selectionId, pricePerPackage, recyclingFeePerPackage }
 */
export async function createTemporarySelection(
  params: CreateTempSelectionParams
): Promise<CreateTempSelectionResult> {
  const {
    sessionId,
    selectedProducts,
    selectedSize,
    packageSlug,
    isMysteryBox = false,
    sugarPreference,
  } = params;

  // 1) Basic checks
  if (!sessionId) {
    throw new Error('Missing sessionId');
  }
  if (!selectedSize || !selectedProducts || !packageSlug) {
    throw new Error('Missing required fields: selectedSize, selectedProducts, or packageSlug');
  }

  // Confirm total items = selectedSize
  const totalSelected = Object.values(selectedProducts).reduce((sum, qty) => sum + qty, 0);
  if (totalSelected !== selectedSize) {
    throw new Error('Selected products do not match the package size');
  }

  // 2) Fetch package from DB (to confirm existence & possibly get sizes/drinks)
  const { data: pkgRow, error: pkgError } = await supabaseAdmin
    .from('packages')
    .select('*')
    .eq('slug', packageSlug)
    .single();

  if (pkgError) {
    throw new Error(`Error fetching package: ${pkgError.message}`);
  }
  if (!pkgRow) {
    throw new Error(`Invalid package slug: "${packageSlug}"`);
  }

  // 3) Calculate price + recycling fee
  const { pricePerPackage, recyclingFeePerPackage } = await calculatePrice({
    packageData: pkgRow,
    selectedSize,
    selectedProducts,
    // If your `pkgRow` doesn't have joined package_sizes or drinks,
    // you may need to provide them or fetch them separately.
  });

  // 4) Retrieve the existing session row so we can merge the new selection
  const { data: sessionRow, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .select('temporary_selections')
    .eq('session_id', sessionId)
    .single();

  if (sessionError) {
    throw new Error(`Session fetch error: ${sessionError.message}`);
  }
  if (!sessionRow) {
    throw new Error('Session not found');
  }

  // 5) Build a deterministic key: "<packageSlug>-<selectedSize>-<sugarPreference>"
  //    e.g. "mixed-boosters-12-alle"
  //    If sugarPreference is undefined, default to something (e.g. "alle" or "unknown").
  const normalizedSugarPref = sugarPreference || 'alle';
  const selectionKey = `${packageSlug}-${selectedSize}-${normalizedSugarPref}`;

  // 6) Insert/overwrite that key in the existing temporary_selections object
  const existingTempSelections = sessionRow.temporary_selections || {};
  existingTempSelections[selectionKey] = {
    selectedProducts,
    selectedSize,
    packageSlug,
    isMysteryBox,
    sugarPreference: normalizedSugarPref,
    createdAt: new Date().toISOString(),
  };

  // 7) Update the DB
  const { error: updateError } = await supabaseAdmin
    .from('sessions')
    .update({ temporary_selections: existingTempSelections })
    .eq('session_id', sessionId);

  if (updateError) {
    throw new Error(`Error updating session: ${updateError.message}`);
  }

  // 8) Return the result, using `selectionKey` as "selectionId"
  return {
    success: true,
    selectionId: selectionKey, // same as the new key
    pricePerPackage,
    recyclingFeePerPackage,
  };
}
