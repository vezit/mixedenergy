// lib/priceCalculations.js

import { db } from './firebaseAdmin';

export async function calculatePrice({ packageData, selectedSize, selectedProducts }) {
  // Fetch drinks data required for selected products
  const selectedDrinkSlugs = Object.keys(selectedProducts);
  const drinksData = {};
  for (const slug of selectedDrinkSlugs) {
    const drinkDoc = await db.collection('drinks').doc(slug).get();
    if (!drinkDoc.exists) {
      throw new Error(`Drink not found: ${slug}`);
    }
    drinksData[slug] = drinkDoc.data();
  }

  let totalDrinkPrice = 0;
  let totalRecyclingFee = 0;
  let totalQuantity = 0;

  for (const slug of selectedDrinkSlugs) {
    const quantity = selectedProducts[slug];
    const drinkData = drinksData[slug];

    const salePrice = drinkData._salePrice; // Price in cents
    const recyclingFee = drinkData.recyclingFee || 0; // Recycling fee in cents

    totalDrinkPrice += salePrice * quantity;
    totalRecyclingFee += recyclingFee * quantity;
    totalQuantity += quantity;
  }

  // Ensure totalQuantity matches selectedSize
  if (totalQuantity !== parseInt(selectedSize)) {
    throw new Error('Total quantity of selected drinks does not match the package size');
  }

  // Apply package discount
  const packageOption = packageData.packages.find(
    (pkg) => pkg.size === parseInt(selectedSize)
  );
  if (!packageOption) {
    throw new Error('Invalid package size selected');
  }
  const discountMultiplier = packageOption.discount || 1; // Default to no discount if not specified

  let discountedPrice = totalDrinkPrice * discountMultiplier;

  // Round up to the nearest multiple of 'roundTo' in kr (1 kr = 100 øre)
  const roundTo = packageOption.roundUpOrDown || 5; // Default to rounding up to nearest 5 kr
  discountedPrice = Math.ceil(discountedPrice / (roundTo * 100)) * (roundTo * 100);

  const pricePerPackage = discountedPrice; // Now matches the displayed price
  const recyclingFeePerPackage = totalRecyclingFee; // Recycling fee is not discounted

  return { pricePerPackage, recyclingFeePerPackage, originalTotalPrice: totalDrinkPrice };
}
