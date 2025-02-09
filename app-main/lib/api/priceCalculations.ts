// priceCalculations.ts

export interface DrinkData {
  sale_price: number;       // in øre (cents)
  recycling_fee?: number;   // in øre (optional)
  [key: string]: any;       // any additional fields
}

export interface PackageOption {
  size: number;
  discount?: number;        // e.g. 0.9 for 10% discount
  roundUpOrDown?: number;   // e.g. 5 => round to nearest 5 kr
}

export interface PackageData {
  packages: PackageOption[];
  // ...other package fields if needed
}

export interface CalculatePriceParams {
  packageData: PackageData;
  selectedSize: number;  // changed from string -> number
  selectedProducts: Record<string, number>; // e.g. { "monster-energy": 2, ... }
  drinksData?: Record<string, DrinkData>;    // pass in so we can do arithmetic
}

export interface CalculatePriceReturn {
  pricePerPackage: number;         // final, discounted + rounded, in cents
  recyclingFeePerPackage: number;  // total recycling fee for the package, in cents
  originalTotalPrice: number;      // sum of base sale_price * quantity, before discount
}

/**
 * Calculates the price of a package based on selected drinks & package options.
 * This version does NOT do DB calls. You must supply 'drinksData' as needed.
 */
export async function calculatePrice({
  packageData,
  selectedSize,
  selectedProducts,
  drinksData = {},
}: CalculatePriceParams): Promise<CalculatePriceReturn> {
  // 1) Sum up all drinks
  let totalDrinkPrice = 0;
  let totalRecyclingFee = 0;
  let totalQuantity = 0;

  for (const slug of Object.keys(selectedProducts)) {
    const quantity = selectedProducts[slug];
    const drink = drinksData[slug];
    if (!drink) {
      throw new Error(`Drink data not provided for slug: ${slug}`);
    }
    const salePrice = drink.sale_price;             // in cents
    const recyclingFee = drink.recycling_fee || 0;  // also in cents

    totalDrinkPrice += salePrice * quantity;
    totalRecyclingFee += recyclingFee * quantity;
    totalQuantity += quantity;
  }

  // 2) Check package size matches the sum of quantities
  if (totalQuantity !== selectedSize) {
    throw new Error('Total quantity of selected drinks does not match the package size');
  }

  // 3) Find the matching package option to see if there's a discount
  const packageOption = packageData.packages.find(
    (pkg) => pkg.size === selectedSize
  );
  if (!packageOption) {
    throw new Error(`No package option found for size=${selectedSize}`);
  }

  const discountMultiplier = packageOption.discount ?? 1; // e.g. 0.9 = 10% discount
  let discountedPrice = totalDrinkPrice * discountMultiplier;

  // 4) Round to nearest multiple of roundUpOrDown in KR (1 KR = 100 øre)
  const roundToKr = packageOption.roundUpOrDown ?? 5; // default 5
  // convert discountedPrice => float # of KR, then apply ceiling
  // for example, if roundToKr=5 => nearest 5 KR
  discountedPrice = Math.ceil(discountedPrice / (roundToKr * 100)) * (roundToKr * 100);

  // 5) Final
  const pricePerPackage = discountedPrice;
  const recyclingFeePerPackage = totalRecyclingFee;
  const originalTotalPrice = totalDrinkPrice;

  return {
    pricePerPackage,
    recyclingFeePerPackage,
    originalTotalPrice,
  };
}
