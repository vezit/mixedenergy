// /pages/api/supabase/createTemporarySelection.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import cookie from 'cookie';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { calculatePrice } from '../../../lib/priceCalculations';

interface BodyParams {
  selectedProducts: Record<string, number>;
  selectedSize: number;
  packageSlug: string;
  isMysteryBox?: boolean;
  sugarPreference?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).end(); // Method Not Allowed
    }

    // 1) Validate sessionId cookie
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionId = cookies.session_id;
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing session_id cookie' });
    }

    // 2) Parse request body
    const {
      selectedProducts,
      selectedSize,
      packageSlug,
      isMysteryBox,
      sugarPreference,
    } = req.body as BodyParams;

    if (!selectedProducts || !selectedSize || !packageSlug) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate total items
    const totalSelected = Object.values(selectedProducts).reduce(
      (sum, qty) => sum + qty,
      0
    );

    // Validate total selected matches selectedSize
    if (totalSelected !== parseInt(String(selectedSize), 10)) {
      return res.status(400).json({ error: 'Selected products do not match package size' });
    }

    // 3) Fetch package details from Supabase
    const { data: pkgRow, error: pkgError } = await supabaseAdmin
      .from('packages')
      .select('*')
      .eq('slug', packageSlug)
      .single();

    if (pkgError) {
      console.error('Package fetch error:', pkgError);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!pkgRow) {
      return res.status(400).json({ error: 'Invalid package slug' });
    }

    // 4) Compute price and recycling fee
    //    The calculatePrice function expects { packageData, selectedSize, selectedProducts }.
    const { pricePerPackage, recyclingFeePerPackage } = await calculatePrice({
      packageData: pkgRow,
      selectedSize,
      selectedProducts,
    });

    // 5) Generate a selectionId
    const selectionId = uuidv4();

    // 6) Retrieve the existing session row so we can merge the new selection
    const { data: sessionRow, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('temporary_selections')
      .eq('session_id', sessionId)
      .single();

    if (sessionError) {
      console.error('Session fetch error:', sessionError);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!sessionRow) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // 7) Merge a new selection into the existing "temporary_selections" JSON
    //    If "temporary_selections" is null or undefined, default to {}
    const existingTempSelections = sessionRow.temporary_selections || {};
    const newTempSelections = {
      ...existingTempSelections,
      [selectionId]: {
        selectedProducts,
        selectedSize,
        packageSlug,
        isMysteryBox,
        sugarPreference,
        createdAt: new Date().toISOString(),
      },
    };

    // 8) Update the session row
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({ temporary_selections: newTempSelections })
      .eq('session_id', sessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // 9) Respond with success
    return res.status(200).json({
      success: true,
      selectionId,
      price: pricePerPackage, // Price for one package
      recyclingFeePerPackage,
    });
  } catch (error) {
    console.error('Error creating temporary selection:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
