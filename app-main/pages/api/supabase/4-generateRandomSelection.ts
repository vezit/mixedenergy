// apu/supabase/4-generateRandomSelection.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../../../lib/api/supabaseAdmin';

/** The shape of your incoming POST body */
interface BodyParams {
  sessionId: string;
  slug: string;
  selectedSize: number;
  sugarPreference?: 'uden_sukker' | 'med_sukker' | 'alle';
  isCustomSelection?: boolean;
  selectedProducts?: Record<string, number>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('[4-generateRandomSelection] Called, method =', req.method);

  try {
    if (req.method !== 'POST') {
      console.log('[4-generateRandomSelection] Method not allowed:', req.method);
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const {
      sessionId,
      slug,
      selectedSize,
      sugarPreference = 'alle',
      isCustomSelection = false,
      selectedProducts,
    } = req.body as BodyParams;

    console.log('[4-generateRandomSelection] Received body:', req.body);

    // 1) Basic validation
    if (!sessionId || !slug || !selectedSize) {
      console.log('[4-generateRandomSelection] Missing required fields');
      return res
        .status(400)
        .json({ error: 'Missing sessionId, slug, or selectedSize.' });
    }

    // 2) Fetch the package row (and join on package_drinks → drinks)
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
      console.error('[4-generateRandomSelection] Error fetching package:', pkgError);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!pkgRow) {
      console.log('[4-generateRandomSelection] Package not found for slug:', slug);
      return res.status(404).json({ error: 'Package not found' });
    }

    // Build an array of { slug, is_sugar_free }
    const joinedDrinks: Array<{ slug: string; is_sugar_free: boolean }> =
      pkgRow.package_drinks?.map((pd: any) => pd.drinks) || [];

    if (!joinedDrinks.length) {
      console.log('[4-generateRandomSelection] No joined drinks for package slug=', slug);
      return res.status(400).json({ error: 'No drinks linked to this package' });
    }

    // 3) If isCustomSelection => just use `selectedProducts`
    let finalSelectedProducts: Record<string, number> = {};
    if (isCustomSelection && selectedProducts) {
      finalSelectedProducts = { ...selectedProducts };
      console.log('[4-generateRandomSelection] Using custom selection:', finalSelectedProducts);
    } else {
      // Otherwise, do random selection
      finalSelectedProducts = generateRandomSelection({
        allDrinks: joinedDrinks,
        selectedSize,
        sugarPreference,
      });
      console.log('[4-generateRandomSelection] Random selection generated:', finalSelectedProducts);
    }

    // 4) Upsert into the session’s "temporary_selections"
    const { data: existingSession, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('temporary_selections')
      .eq('session_id', sessionId)
      .single();

    if (sessionError || !existingSession) {
      console.error('[4-generateRandomSelection] Session not found in DB for sessionId=', sessionId);
      return res
        .status(404)
        .json({ error: 'Session not found in the database' });
    }

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

    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({ temporary_selections: tempSelections })
      .eq('session_id', sessionId);

    if (updateError) {
      console.error('[4-generateRandomSelection] Error updating session with selection:', updateError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // 5) Respond with success
    console.log('[4-generateRandomSelection] Success, returning selectionId:', selectionId);
    return res.status(200).json({
      success: true,
      selectedProducts: finalSelectedProducts,
      selectionId,
    });
  } catch (err: any) {
    console.error('[4-generateRandomSelection] Catch error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

/** A helper to generate random drinks among the package’s available drinks */
function generateRandomSelection({
  allDrinks,
  selectedSize,
  sugarPreference,
}: {
  allDrinks: { slug: string; is_sugar_free: boolean }[];
  selectedSize: number;
  sugarPreference: 'uden_sukker' | 'med_sukker' | 'alle';
}): Record<string, number> {
  console.log('[generateRandomSelection] Filtering by sugarPreference=', sugarPreference);
  let filtered = allDrinks;
  if (sugarPreference === 'uden_sukker') {
    filtered = allDrinks.filter((d) => d.is_sugar_free);
  } else if (sugarPreference === 'med_sukker') {
    filtered = allDrinks.filter((d) => !d.is_sugar_free);
  }

  if (!filtered.length) {
    throw new Error(`No drinks match sugarPreference: ${sugarPreference}`);
  }

  const finalSelection: Record<string, number> = {};
  let remaining = selectedSize;

  // simple random picks
  while (remaining > 0) {
    const randomIndex = Math.floor(Math.random() * filtered.length);
    const slug = filtered[randomIndex].slug;
    finalSelection[slug] = (finalSelection[slug] || 0) + 1;
    remaining--;
  }

  return finalSelection;
}
