// lib/api/session/createTemporarySelection.ts

import { v4 as uuidv4 } from 'uuid';
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

  // 2) Fetch package from DB
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
  //    (calculatePrice typically requires { packageData, selectedSize, selectedProducts, drinksData? })
  //    If your package row does not contain "package_sizes" or "package_drinks",
  //    you may need a more complete DB fetch, like in getCalculatedPackagePrice.
  const { pricePerPackage, recyclingFeePerPackage } = await calculatePrice({
    packageData: pkgRow,
    selectedSize,
    selectedProducts,
    // If your `pkgRow` doesn't have joined package_sizes or drinks,
    // you may need to provide them or fetch them separately.
  });

  // 4) Retrieve the session row so we can merge the new selection
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

  // 5) Add a new selection entry
  const selectionId = uuidv4();
  const existingTempSelections = sessionRow.temporary_selections || {};

  existingTempSelections[selectionId] = {
    selectedProducts,
    selectedSize,
    packageSlug,
    isMysteryBox,
    sugarPreference,
    createdAt: new Date().toISOString(),
  };

  // 6) Update DB
  const { error: updateError } = await supabaseAdmin
    .from('sessions')
    .update({ temporary_selections: existingTempSelections })
    .eq('session_id', sessionId);

  if (updateError) {
    throw new Error(`Error updating session: ${updateError.message}`);
  }

  // 7) Return result
  return {
    success: true,
    selectionId,
    pricePerPackage,
    recyclingFeePerPackage,
  };
}
