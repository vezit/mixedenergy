import { db } from './firebaseAdmin.ts.old';

// Define the shape of your drink data as stored in Firestore
interface DrinkData {
  _salePrice: number;       // Price in cents
  recyclingFee?: number;    // Recycling fee in cents (optional)
  [key: string]: any;       // For any other untyped fields in Firestore
}

interface PackageOption {
  size: number;
  discount?: number;       // e.g., 0.9 for 10% discount
  roundUpOrDown?: number;  // e.g., 5 => round to nearest 5 kr
}

interface PackageData {
  packages: PackageOption[];
}

interface CalculatePriceParams {
  packageData: PackageData;
  selectedSize: string; // the size is given as a string, but we parse it to number
  selectedProducts: Record<string, number>; // { [slug]: quantity }
}

interface CalculatePriceReturn {
  pricePerPackage: number;         // final, potentially discounted + rounded, in cents
  recyclingFeePerPackage: number;  // total recycling fee for the package, in cents
  originalTotalPrice: number;      // sum of salePrice * quantity, before discount/round, in cents
}

/**
 * Calculates the price of a package based on selected drinks and package options.
 *
 * @param packageData - Package configuration data
 * @param selectedSize - The size of the package (string, will be parsed to number)
 * @param selectedProducts - A record object where keys are drink slugs and values are quantities
 * @returns An object containing the final price, recycling fee, and original total price
 */
export async function calculatePrice({
  packageData,
  selectedSize,
  selectedProducts,
}: CalculatePriceParams): Promise<CalculatePriceReturn> {
  // Fetch drinks data required for selected products
  const selectedDrinkSlugs = Object.keys(selectedProducts);
  const drinksData: Record<string, DrinkData> = {};

  for (const slug of selectedDrinkSlugs) {
    const drinkDoc = await db.collection('drinks').doc(slug).get();
    if (!drinkDoc.exists) {
      throw new Error(`Drink not found: ${slug}`);
    }
    drinksData[slug] = drinkDoc.data() as DrinkData;
  }

  let totalDrinkPrice = 0;
  let totalRecyclingFee = 0;
  let totalQuantity = 0;

  for (const slug of selectedDrinkSlugs) {
    const quantity = selectedProducts[slug];
    const drinkData = drinksData[slug];

    const salePrice = drinkData._salePrice;       // Price in cents
    const recyclingFee = drinkData.recyclingFee || 0; // Recycling fee in cents

    totalDrinkPrice += salePrice * quantity;
    totalRecyclingFee += recyclingFee * quantity;
    totalQuantity += quantity;
  }

  // Ensure totalQuantity matches selectedSize
  if (totalQuantity !== parseInt(selectedSize, 10)) {
    throw new Error('Total quantity of selected drinks does not match the package size');
  }

  // Apply package discount
  const packageOption = packageData.packages.find(
    (pkg) => pkg.size === parseInt(selectedSize, 10)
  );
  if (!packageOption) {
    throw new Error('Invalid package size selected');
  }

  const discountMultiplier = packageOption.discount || 1; // Default to no discount if not specified
  let discountedPrice = totalDrinkPrice * discountMultiplier;

  // Round up to the nearest multiple of 'roundTo' in kr (1 kr = 100 øre)
  const roundTo = packageOption.roundUpOrDown ?? 5; // Default to rounding up to nearest 5 kr
  discountedPrice = Math.ceil(discountedPrice / (roundTo * 100)) * (roundTo * 100);

  const pricePerPackage = discountedPrice;          // matches the displayed price
  const recyclingFeePerPackage = totalRecyclingFee; // recycling fee is not discounted

  return {
    pricePerPackage,
    recyclingFeePerPackage,
    originalTotalPrice: totalDrinkPrice,
  };
}
