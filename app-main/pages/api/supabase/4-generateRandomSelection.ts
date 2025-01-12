// /pages/api/supabase/4-generateRandomSelection.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

/** The shape of your incoming POST body */
interface BodyParams {
  sessionId: string; // require sessionId in the POST body
  slug: string;
  selectedSize: number;
  sugarPreference?: string | null;
  isCustomSelection?: boolean;
  selectedProducts?: Record<string, number>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('[4-generateRandomSelection] Incoming request:', req.method);

  try {
    if (req.method !== 'POST') {
      console.log('[4-generateRandomSelection] Method not allowed:', req.method);
      return res.status(405).end(); // Method Not Allowed
    }

    // 1) Read sessionId from POST body
    const {
      sessionId,
      slug,
      selectedSize,
      sugarPreference = null,
      isCustomSelection = false,
      selectedProducts = null,
    } = req.body as BodyParams;

    console.log('[4-generateRandomSelection] Body params received:', {
      sessionId,
      slug,
      selectedSize,
      sugarPreference,
      isCustomSelection,
      selectedProducts,
    });

    // If sessionId is missing, return error
    if (!sessionId) {
      console.log('[4-generateRandomSelection] Missing sessionId in POST body.');
      return res.status(400).json({ error: 'Missing sessionId in POST body.' });
    }

    // 2) Fetch the package row from Supabase
    console.log('[4-generateRandomSelection] Fetching package with slug =', slug);
    const { data: packageRow, error: packageError } = await supabaseAdmin
      .from('packages')
      .select('*')
      .eq('slug', slug)
      .single();

    if (packageError) {
      console.error('[4-generateRandomSelection] Error fetching package:', packageError);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!packageRow) {
      console.log('[4-generateRandomSelection] Package not found for slug:', slug);
      return res.status(400).json({ error: 'Invalid package slug' });
    }

    // The "collectionsDrinks" field presumably lists the drink slugs for random selection
    const { collectionsDrinks } = packageRow as any;
    console.log('[4-generateRandomSelection] collectionsDrinks =', collectionsDrinks);
    if (!collectionsDrinks || !Array.isArray(collectionsDrinks)) {
      console.log('[4-generateRandomSelection] No collectionsDrinks array found.');
      return res.status(400).json({ error: 'No collectionsDrinks found for this package' });
    }

    // 3) Fetch relevant drinks
    console.log('[4-generateRandomSelection] Now fetching drinks data for these slugs:', collectionsDrinks);
    const drinksData = await getDrinksData(collectionsDrinks);
    console.log('[4-generateRandomSelection] drinksData fetched:', drinksData);

    let finalSelectedProducts: Record<string, number> = {};

    // 4) If custom selection, use it; else generate random
    if (isCustomSelection && selectedProducts) {
      console.log('[4-generateRandomSelection] Using custom selection from body.');
      finalSelectedProducts = selectedProducts;
    } else {
      console.log('[4-generateRandomSelection] sugarPreference =', sugarPreference);
      if (!sugarPreference) {
        console.log('[4-generateRandomSelection] Missing sugarPreference for random selection.');
        return res.status(400).json({ error: 'Missing sugarPreference for random selection' });
      }
      console.log('[4-generateRandomSelection] Generating random selection...');
      finalSelectedProducts = generateRandomSelection({
        drinksData,
        selectedSize,
        sugarPreference,
      });
    }

    // 5) Insert or update in "sessions" table
    const selectionId = uuidv4();
    console.log('[4-generateRandomSelection] selectionId generated:', selectionId);

    console.log('[4-generateRandomSelection] Checking session row for sessionId =', sessionId);
    const { data: existingSession, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('temporary_selections')
      .eq('session_id', sessionId)
      .single();

    if (sessionError) {
      console.error('[4-generateRandomSelection] Error fetching session row:', sessionError);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!existingSession) {
      console.log('[4-generateRandomSelection] Session not found in DB for sessionId:', sessionId);
      return res.status(404).json({ error: 'Session not found' });
    }

    const tempSelections = existingSession.temporary_selections || {};
    tempSelections[selectionId] = {
      selectedProducts: finalSelectedProducts,
      sugarPreference,
      selectedSize,
      packageSlug: slug,
      isCustomSelection,
      createdAt: new Date().toISOString(),
    };

    console.log('[4-generateRandomSelection] Merging new selection with existing session. Will update DB now...');
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({ temporary_selections: tempSelections })
      .eq('session_id', sessionId);

    if (updateError) {
      console.error('[4-generateRandomSelection] Error updating session row:', updateError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // 6) Return the new selection
    console.log('[4-generateRandomSelection] Successfully generated selection. Returning 200...');
    return res.status(200).json({
      success: true,
      selectedProducts: finalSelectedProducts,
      selectionId,
    });
  } catch (error: any) {
    console.error('[4-generateRandomSelection] Catch block error:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Fetch the drink data for the given slugs from Supabase
 */
async function getDrinksData(drinkSlugs: string[]) {
  console.log('[getDrinksData] Running .in("slug", drinkSlugs):', drinkSlugs);
  const { data, error } = await supabaseAdmin
    .from('drinks')
    .select('slug, is_sugar_free')
    .in('slug', drinkSlugs);

  if (error) {
    console.error('[getDrinksData] Error from DB:', error);
    throw new Error(`Error fetching drinks: ${error.message}`);
  }
  if (!data || data.length === 0) {
    console.log('[getDrinksData] No rows returned for slugs:', drinkSlugs);
    throw new Error(`No drinks returned for slugs: ${drinkSlugs}`);
  }

  const drinksData: Record<string, { is_sugar_free: boolean }> = {};
  for (const row of data) {
    drinksData[row.slug] = {
      is_sugar_free: row.is_sugar_free,
    };
  }
  console.log('[getDrinksData] drinksData result:', drinksData);
  return drinksData;
}

/**
 * Generate a random selection from the available drinks
 */
function generateRandomSelection({
  drinksData,
  selectedSize,
  sugarPreference,
}: {
  drinksData: Record<string, { is_sugar_free: boolean }>;
  selectedSize: number;
  sugarPreference: string;
}) {
  console.log('[generateRandomSelection] selectedSize:', selectedSize, 'sugarPreference:', sugarPreference);

  const randomSelection: Record<string, number> = {};
  let remaining = selectedSize;

  const available = Object.entries(drinksData).filter(([slug, drink]) => {
    if (sugarPreference === 'uden_sukker') {
      return drink.is_sugar_free;
    } else if (sugarPreference === 'med_sukker') {
      return !drink.is_sugar_free;
    }
    return true; // 'alle'
  });

  if (available.length === 0) {
    console.log('[generateRandomSelection] No drinks match sugarPreference =', sugarPreference);
    throw new Error('No drinks match your sugar preference.');
  }

  // Generate the random selection
  while (remaining > 0) {
    const randomIndex = Math.floor(Math.random() * available.length);
    const [drinkSlug] = available[randomIndex];
    randomSelection[drinkSlug] = (randomSelection[drinkSlug] || 0) + 1;
    remaining--;
  }

  console.log('[generateRandomSelection] Final random selection:', randomSelection);
  return randomSelection;
}
