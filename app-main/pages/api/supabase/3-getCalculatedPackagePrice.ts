// /pages/api/supabase/getCalculatedPackagePrice.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin'; 
import { calculatePrice } from '../../../lib/priceCalculations'; 
import { Database } from '../../../types/supabase'; // If you have generated types

interface BodyParams {
  selectedProducts?: Record<string, number>;
  selectedSize: number;
  slug: string;
  isMysteryBox?: boolean;
  sugarPreference?: 'alle' | 'med_sukker' | 'uden_sukker';
}

/**
 * Example of how your "packages" row might look if you're using Supabase
 * with typed definitions. You can also just use "any" if you prefer.
 */
type PackageRow = Database['public']['Tables']['packages']['Row'] & {
  collectionsDrinks?: string[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).end(); // Method Not Allowed
    }

    // 1) Parse request body
    const {
      selectedProducts = {},
      selectedSize,
      slug,
      isMysteryBox,
      sugarPreference = 'alle',
    } = req.body as BodyParams;

    // 2) Fetch the package data from Supabase
    const { data: packageRow, error: packageError } = await supabaseAdmin
      .from('packages')
      .select('*')
      .eq('slug', slug)
      .single<PackageRow>();

    if (packageError) {
      console.error('Package fetch error:', packageError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!packageRow) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // "collectionsDrinks" is presumably an array of drink slugs
    const { collectionsDrinks } = packageRow;

    let productsToCalculate = { ...selectedProducts };

    // 3) Handle Mysterybox selection
    if (isMysteryBox && collectionsDrinks?.length) {
      // Fetch drinks that match the package's collectionsDrinks array
      const { data: drinksData, error: drinksError } = await supabaseAdmin
        .from('drinks')
        .select('slug, is_sugar_free')
        .in('slug', collectionsDrinks);

      if (drinksError) {
        console.error('Drinks fetch error:', drinksError);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!drinksData?.length) {
        return res.status(404).json({ error: 'No drinks found for package' });
      }

      // Filter drinks based on sugar preference
      const filteredDrinks = drinksData.filter((drink) => {
        if (sugarPreference === 'med_sukker') return !drink.is_sugar_free;
        if (sugarPreference === 'uden_sukker') return drink.is_sugar_free;
        return true; // "alle"
      });

      if (!filteredDrinks.length) {
        return res.status(404).json({
          error: `No drinks match your sugar preference: ${sugarPreference}`,
        });
      }

      // Generate a random selection for the total items = selectedSize
      productsToCalculate = {};
      const totalItems = selectedSize;

      for (let i = 0; i < totalItems; i++) {
        const randomIndex = Math.floor(Math.random() * filteredDrinks.length);
        const { slug: drinkSlug } = filteredDrinks[randomIndex];
        productsToCalculate[drinkSlug] = (productsToCalculate[drinkSlug] || 0) + 1;
      }
    }

    // 4) Calculate the price using your utility
    //    The "calculatePrice" function presumably wants:
    //    { packageData, selectedSize, selectedProducts }
    //    Adjust if your function signature differs
    const { 
      pricePerPackage, 
      recyclingFeePerPackage, 
      originalTotalPrice 
    } = await calculatePrice({
      packageData: packageRow,   // or rename "package" => "packageData"
      selectedSize,
      selectedProducts: productsToCalculate,
    });

    // 5) Return the results
    return res.status(200).json({
      price: pricePerPackage,
      recyclingFeePerPackage,
      originalPrice: originalTotalPrice,
    });
  } catch (error) {
    console.error('Error calculating package price:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
