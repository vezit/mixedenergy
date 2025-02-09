// lib/api/session/updateSession.ts

import { supabaseAdmin } from '../supabaseAdmin';
import { calculatePrice } from '../priceCalculations';

/** -----------------------------
 *  INTERFACES (inline)
 * ----------------------------- */
export interface SessionRow {
  session_id: string;
  basket_details?: BasketDetails;
  temporary_selections?: Record<string, any>;
}

export interface BasketDetails {
  items?: BasketItem[];
  customerDetails?: CustomerDetails;
  deliveryDetails?: DeliveryDetails;
  // ...any extra fields
}

export interface BasketItem {
  slug: string;
  quantity: number;
  packages_size?: number;
  selectedDrinks?: Record<string, number>;
  pricePerPackage?: number;
  recyclingFeePerPackage?: number;
  totalPrice?: number;
  totalRecyclingFee?: number;
  sugarPreference?: string;
}

export interface CustomerDetails {
  fullName?: string | null;
  mobileNumber?: string | null;
  email?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  [key: string]: any;
}

export interface DeliveryDetails {
  provider?: string;
  trackingNumber?: string | null;
  estimatedDeliveryDate?: string | null;
  deliveryType?: string;  // e.g. 'homeDelivery' / 'pickupPoint'
  deliveryFee?: number;   // in øre
  currency?: string;
  deliveryAddress?: any;  // your address structure
  providerDetails?: any;  // e.g. {postnord:{...}, gls:{...}}
  createdAt?: string;
}

/**
 * updateSession
 * - Fetches the session row from Supabase
 * - Updates basket_details based on the "action"
 * - Possible actions: addItem, removeItem, updateQuantity, updateDeliveryDetails, updateCustomerDetails
 */
export async function updateSession(
  action: string,
  sessionId: string,
  body: any,
) {
  // 1) Fetch the session row
  const { data: sessionRow, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .select('session_id, basket_details, temporary_selections')
    .eq('session_id', sessionId)
    .single<SessionRow>();

  if (sessionError) {
    throw new Error(`[updateSession] Error fetching session: ${sessionError.message}`);
  }
  if (!sessionRow) {
    throw new Error('[updateSession] Session not found');
  }

  // 2) Extract the current basket details
  const basketDetails: BasketDetails = sessionRow.basket_details || {};
  let items: BasketItem[] = basketDetails.items || [];

  // 3) Handle the requested action
  switch (action) {
    /** ---------------
     *  updateDeliveryDetails
     * --------------- */
    case 'updateDeliveryDetails': {
      const { deliveryOption, deliveryAddress, providerDetails } = body;
      if (!deliveryOption || !deliveryAddress || !providerDetails) {
        throw new Error('[updateSession] Missing delivery details');
      }

      // 1) Update or create DeliveryDetails
      const deliveryDetails: DeliveryDetails = {
        provider: 'postnord',
        trackingNumber: null,
        estimatedDeliveryDate: null,
        deliveryType: deliveryOption, // e.g. 'homeDelivery' or 'pickupPoint'
        deliveryFee: 0,
        currency: 'DKK',
        deliveryAddress,
        providerDetails,
        createdAt: new Date().toISOString(),
      };

      basketDetails.deliveryDetails = deliveryDetails;

      // 2) Recalc shipping fee if needed
      await recalcDeliveryFee(basketDetails);

      // 3) Save changes
      await updateBasketDetails(sessionId, basketDetails);

      return {
        success: true,
        deliveryDetails: basketDetails.deliveryDetails,
      };
    }

    /** ---------------
     *  addItem
     * --------------- */
    case 'addItem': {
      const { selectionId, quantity } = body;
      if (!selectionId) {
        throw new Error('[updateSession] Missing selectionId');
      }
      if (!quantity || quantity <= 0) {
        throw new Error('[updateSession] Quantity must be > 0');
      }

      // 1) Retrieve selection from temporary_selections
      const tempSelections = sessionRow.temporary_selections || {};
      const selection = tempSelections[selectionId];
      if (!selection) {
        throw new Error('[updateSession] Invalid or expired selectionId');
      }

      // 2) Extract data from selection
      const { selectedProducts, sugarPreference, selectedSize, packageSlug } = selection;

      // 3) Fetch package from DB
      const { data: pkgRow, error: pkgError } = await supabaseAdmin
        .from('packages')
        .select('*')
        .eq('slug', packageSlug)
        .single();

      if (pkgError) {
        throw new Error(`[updateSession] Error fetching package: ${pkgError.message}`);
      }
      if (!pkgRow) {
        throw new Error('[updateSession] Invalid package slug');
      }

      // 4) Calculate price & recycling fee for one package
      const { pricePerPackage, recyclingFeePerPackage } = await calculatePrice({
        packageData: pkgRow,
        selectedSize,
        selectedProducts,
      });
      const totalPrice = pricePerPackage * quantity;
      const totalRecyclingFee = recyclingFeePerPackage * quantity;

      // 5) Check if the same item already exists
      let itemFound = false;
      for (const item of items) {
        const sameSlug = item.slug === packageSlug;
        const sameSize = item.packages_size === selectedSize;
        const sameDrinks = isSameSelection(item.selectedDrinks || {}, selectedProducts);
        if (sameSlug && sameSize && sameDrinks) {
          // => Update existing
          item.quantity += quantity;
          item.totalPrice = (item.totalPrice || 0) + totalPrice;
          item.totalRecyclingFee = (item.totalRecyclingFee || 0) + totalRecyclingFee;
          itemFound = true;
          break;
        }
      }

      // If not found, push new
      if (!itemFound) {
        items.push({
          slug: packageSlug,
          quantity,
          packages_size: selectedSize,
          selectedDrinks: selectedProducts,
          pricePerPackage,
          recyclingFeePerPackage,
          totalPrice,
          totalRecyclingFee,
          sugarPreference,
        });
      }

      basketDetails.items = items;

      // 6) Recalc shipping fee if a delivery method is set
      await recalcDeliveryFee(basketDetails);

      // 7) Update DB
      await updateBasketDetails(sessionId, basketDetails);

      return {
        success: true,
        items,
        deliveryDetails: basketDetails.deliveryDetails || null,
      };
    }

    /** ---------------
     *  removeItem
     * --------------- */
    case 'removeItem': {
      const { itemIndex } = body;
      if (itemIndex === undefined || itemIndex < 0 || itemIndex >= items.length) {
        throw new Error('[updateSession] Invalid item index');
      }

      items.splice(itemIndex, 1);
      basketDetails.items = items;

      // Recalc shipping if needed
      await recalcDeliveryFee(basketDetails);
      await updateBasketDetails(sessionId, basketDetails);

      return {
        success: true,
        items,
        deliveryDetails: basketDetails.deliveryDetails || null,
      };
    }

    /** ---------------
     *  updateQuantity
     * --------------- */
    case 'updateQuantity': {
      const { itemIndex, quantity } = body;
      if (itemIndex === undefined || itemIndex < 0 || itemIndex >= items.length) {
        throw new Error('[updateSession] Invalid item index');
      }
      if (!quantity || quantity <= 0) {
        throw new Error('[updateSession] Quantity must be > 0');
      }

      const item = items[itemIndex];
      item.quantity = quantity;
      item.totalPrice = (item.pricePerPackage ?? 0) * quantity;
      item.totalRecyclingFee = (item.recyclingFeePerPackage ?? 0) * quantity;

      basketDetails.items = items;

      // Recalc shipping
      await recalcDeliveryFee(basketDetails);
      await updateBasketDetails(sessionId, basketDetails);

      return {
        success: true,
        items,
        deliveryDetails: basketDetails.deliveryDetails || null,
      };
    }

    /** ---------------
     *  updateCustomerDetails
     * --------------- */
    case 'updateCustomerDetails': {
      const { customerDetails } = body;
      if (!customerDetails || typeof customerDetails !== 'object') {
        throw new Error('[updateSession] Invalid customerDetails object');
      }

      // Optional validations
      const allowedFields = ['fullName', 'mobileNumber', 'email', 'address', 'postalCode', 'city'];
      const errors: Record<string, string> = {};
      const updatedCustomerDetails: Record<string, string | null> = {};

      for (const field of allowedFields) {
        let value = customerDetails[field];
        if (typeof value !== 'string' || !value.trim()) {
          updatedCustomerDetails[field] = null;
          errors[field] = `${field} er påkrævet`;
        } else {
          value = value.trim();
          if (field === 'mobileNumber') {
            const mobileRegex = /^\d{8}$/;
            if (!mobileRegex.test(value)) {
              updatedCustomerDetails[field] = null;
              errors[field] = 'Mobilnummer skal være 8 cifre';
            } else {
              updatedCustomerDetails[field] = value;
            }
          } else if (field === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              updatedCustomerDetails[field] = null;
              errors[field] = 'E-mail format er ugyldigt';
            } else {
              updatedCustomerDetails[field] = value;
            }
          } else if (field === 'postalCode') {
            const pcRegex = /^\d{4}$/;
            if (!pcRegex.test(value)) {
              updatedCustomerDetails[field] = null;
              errors[field] = 'Postnummer skal være 4 cifre';
            } else {
              updatedCustomerDetails[field] = value;
            }
          } else {
            updatedCustomerDetails[field] = value;
          }
        }
      }

      basketDetails.customerDetails = {
        ...(basketDetails.customerDetails || {}),
        ...updatedCustomerDetails,
      };

      await updateBasketDetails(sessionId, basketDetails);

      return {
        success: true,
        errors, // Some fields may have messages if validation failed
      };
    }

    /** ---------------
     *  Default
     * --------------- */
    default:
      throw new Error('[updateSession] Invalid action');
  }
}

/**
 * Updates the session's `basket_details` in the DB
 */
async function updateBasketDetails(sessionId: string, newBasketDetails: BasketDetails) {
  const { error } = await supabaseAdmin
    .from('sessions')
    .update({ basket_details: newBasketDetails })
    .eq('session_id', sessionId);

  if (error) {
    throw new Error(`[updateSession] Error updating basket_details: ${error.message}`);
  }
}

/**
 * If `deliveryType` is set, recalc the shipping fee
 */
async function recalcDeliveryFee(basketDetails: BasketDetails) {
  if (!basketDetails.deliveryDetails?.deliveryType) {
    return;
  }
  const weight = await calculateTotalBasketWeight(basketDetails.items ?? []);
  const fee = getDeliveryFee(weight, basketDetails.deliveryDetails.deliveryType);
  basketDetails.deliveryDetails.deliveryFee = fee;
}

/**
 * Compare two "selectedDrinks" objects
 */
function isSameSelection(a: Record<string, number>, b: Record<string, number>): boolean {
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i] || a[aKeys[i]] !== b[bKeys[i]]) {
      return false;
    }
  }
  return true;
}

/**
 * Approximate weight from "0.5 l" etc.
 */
function approximateWeightFromSize(sizeString: string): number {
  const volumeMatch = sizeString.match(/([\d.]+)\s*l/);
  if (!volumeMatch) return 0;

  const volumeLiters = parseFloat(volumeMatch[1]);
  // ~1 liter ~1 kg
  let weight = volumeLiters;

  // Add packaging (example logic)
  if (volumeLiters === 0.5) {
    weight += 0.02;
  } else if (volumeLiters === 0.25) {
    weight += 0.015;
  } else {
    weight += 0.04 * volumeLiters;
  }
  return weight;
}

/**
 * Calculate the total basket weight by fetching each drink's size from DB
 */
async function calculateTotalBasketWeight(items: BasketItem[]): Promise<number> {
  let totalWeight = 0;

  // 1) Summation of how many of each drink
  const slugCountMap: Record<string, number> = {};
  for (const item of items) {
    if (!item.selectedDrinks) continue;
    for (const [drinkSlug, count] of Object.entries(item.selectedDrinks)) {
      slugCountMap[drinkSlug] = (slugCountMap[drinkSlug] || 0) + count * item.quantity;
    }
  }

  const allSlugs = Object.keys(slugCountMap);
  if (!allSlugs.length) return 0;

  // 2) Fetch the drinks from Supabase to get their "size"
  const { data: drinkRows, error } = await supabaseAdmin
    .from('drinks')
    .select('slug, size')
    .in('slug', allSlugs);

  if (error) {
    throw new Error(`[updateSession] Error fetching drinks: ${error.message}`);
  }

  // 3) Sum up the weight
  for (const row of drinkRows ?? []) {
    const count = slugCountMap[row.slug] || 0;
    const weightPerUnit = approximateWeightFromSize(row.size || '');
    totalWeight += weightPerUnit * count;
  }

  return totalWeight;
}

/**
 * Return the shipping fee in øre (e.g. 8300 = 83.00 DKK)
 */
function getDeliveryFee(weight: number, deliveryOption: string): number {
  const pickupPointFees = [
    { maxWeight: 1, fee: 3200 },
    { maxWeight: 2, fee: 3900 },
    { maxWeight: 5, fee: 5500 },
    { maxWeight: 10, fee: 7500 },
    { maxWeight: 15, fee: 8500 },
    { maxWeight: 20, fee: 8900 },
    { maxWeight: 25, fee: 11000 },
    { maxWeight: 30, fee: 12500 },
    { maxWeight: 35, fee: 13500 },
  ];

  const homeDeliveryFees = [
    { maxWeight: 1, fee: 4300 },
    { maxWeight: 2, fee: 5000 },
    { maxWeight: 5, fee: 6500 },
    { maxWeight: 10, fee: 8300 },
    { maxWeight: 15, fee: 10000 },
    { maxWeight: 20, fee: 11000 },
    { maxWeight: 25, fee: 12000 },
    { maxWeight: 30, fee: 12500 },
    { maxWeight: 35, fee: 13500 },
  ];

  const feeTable = deliveryOption === 'pickupPoint' ? pickupPointFees : homeDeliveryFees;
  const bracket = feeTable.find((b) => weight <= b.maxWeight);

  // If weight is above the highest bracket, use the last fee
  return bracket ? bracket.fee : feeTable[feeTable.length - 1].fee;
}
