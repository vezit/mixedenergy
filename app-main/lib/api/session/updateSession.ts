// lib/api/session/updateSession.ts

import { supabaseAdmin } from '../supabaseAdmin';
import { calculatePrice } from '../priceCalculations';

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
  provider?: string;            // e.g. 'postnord', 'gls'
  trackingNumber?: string | null;
  estimatedDeliveryDate?: string | null;
  deliveryType?: string;        // e.g. 'homeDelivery', 'pickupPoint'
  deliveryFee?: number;         // in øre
  currency?: string;
  deliveryAddress?: any;        // your address structure
  providerDetails?: any;        // e.g. {postnord:{...}, gls:{...}}
  createdAt?: string;
}

/**
 * updateSession
 *  - Named parameters for clarity
 */
export async function updateSession({
  action,
  sessionId,
  data,
}: {
  action: string;
  sessionId: string;
  data?: any;
}) {
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
    /**
 * updateDeliveryDetails
 */
    case 'updateDeliveryDetails': {
      const { deliveryOption, providerDetails, provider } = data;
      if (!provider || !deliveryOption || !providerDetails) {
        throw new Error('[updateSession] Missing delivery details (provider, deliveryOption, providerDetails)');
      }

      // Helper to parse streetName + streetNumber from a single address string
      function splitAddress(fullAddr: string) {
        const regex = /^(.*?)(\s+\d+\S*)$/;
        const match = fullAddr.trim().match(regex);
        if (match) {
          return {
            streetName: match[1].trim(),
            streetNumber: match[2].trim(),
          };
        }
        return {
          streetName: fullAddr.trim(),
          streetNumber: '',
        };
      }

      // We'll build the final deliveryAddress object here
      let finalDeliveryAddress: any = {
        country: 'Danmark',
        pickupPointInfo: {},
        // more fields as needed
      };

      if (deliveryOption === 'homeDelivery') {
        // Use data from basketDetails.customerDetails
        const cust = basketDetails.customerDetails || {};
        const addressString = cust.address || '';
        const { streetName, streetNumber } = splitAddress(addressString);

        finalDeliveryAddress.streetName = streetName;
        finalDeliveryAddress.streetNumber = streetNumber;
        finalDeliveryAddress.postalCode = cust.postalCode || '';
        finalDeliveryAddress.city = cust.city || '';
        // name if you like:
        finalDeliveryAddress.name = cust.fullName || '';

      } else if (deliveryOption === 'pickupPoint') {
        const pickupPoint = providerDetails?.[provider]?.servicePoint;
        if (!pickupPoint) {
          throw new Error(
            `[updateSession] Missing providerDetails.${provider}.servicePoint for pickupPoint`
          );
        }

        finalDeliveryAddress.streetName =
          pickupPoint.visitingAddress?.streetName || '';
        finalDeliveryAddress.streetNumber =
          pickupPoint.visitingAddress?.streetNumber || '';
        finalDeliveryAddress.postalCode =
          pickupPoint.visitingAddress?.postalCode || '';
        finalDeliveryAddress.city = pickupPoint.visitingAddress?.city || '';
        finalDeliveryAddress.name = pickupPoint.name || '';

        finalDeliveryAddress.pickupPointInfo = pickupPoint;
      }

      // Now build the actual DeliveryDetails object
      const deliveryDetails: DeliveryDetails = {
        provider,                       // e.g. 'postnord'
        trackingNumber: null,
        estimatedDeliveryDate: null,
        deliveryType: deliveryOption,   // 'homeDelivery' or 'pickupPoint'
        deliveryFee: 0,
        currency: 'DKK',
        deliveryAddress: finalDeliveryAddress,
        providerDetails,
        createdAt: new Date().toISOString(),
      };

      basketDetails.deliveryDetails = deliveryDetails;

      // Recalc shipping fee if needed
      await recalcDeliveryFee(basketDetails);

      // Save changes
      await updateBasketDetails(sessionId, basketDetails);

      return {
        success: true,
        deliveryDetails: basketDetails.deliveryDetails,
      };
    }

    /**
     * addItem
     */
    case 'addItem': {
      const { selectionId, quantity } = data;
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

      // 3) Fetch the FULL package row, including package_sizes + package_drinks
      const { data: fullPackage, error: pkgErr } = await supabaseAdmin
        .from('packages')
        .select(`
          *,
          package_sizes (size, discount, round_up_or_down),
          package_drinks ( drink_id )
        `)
        .eq('slug', packageSlug)
        .single();

      if (pkgErr) {
        throw new Error(`[updateSession] Error fetching package: ${pkgErr.message}`);
      }
      if (!fullPackage) {
        throw new Error('[updateSession] Invalid package slug');
      }

      // Now we also fetch the actual drinks for this package
      const drinkIds = fullPackage.package_drinks.map((pd: any) => pd.drink_id);
      const { data: drinkRows, error: drErr } = await supabaseAdmin
        .from('drinks')
        .select('slug, sale_price, recycling_fee, is_sugar_free, size')
        .in('id', drinkIds);

      if (drErr) {
        throw new Error(`[updateSession] Error fetching package drinks: ${drErr.message}`);
      }
      if (!drinkRows || drinkRows.length === 0) {
        throw new Error('[updateSession] No drinks found for this package');
      }

      // 4) Build a "drinksData" object for calculatePrice
      const drinksData: Record<string, any> = {};
      for (const d of drinkRows) {
        // for calculatePrice, we at least need sale_price + recycling_fee
        drinksData[d.slug] = {
          sale_price: d.sale_price,
          recycling_fee: d.recycling_fee,
          is_sugar_free: d.is_sugar_free,
          size: d.size,
        };
      }

      // 5) Calculate price & recycling fee for one package
      const { pricePerPackage, recyclingFeePerPackage } = await calculatePrice({
        packageData: {
          ...fullPackage,
          // rename "package_sizes" array to "packages" for calculatePrice
          packages: fullPackage.package_sizes ?? [],
        },
        selectedSize,
        selectedProducts,
        drinksData, // <-- now we pass it in
      });

      const totalPrice = pricePerPackage * quantity;
      const totalRecyclingFee = recyclingFeePerPackage * quantity;

      // 6) Check if the same item already exists in basket
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

      // 7) Recalc shipping fee if a delivery method is set
      await recalcDeliveryFee(basketDetails);

      // 8) Update DB
      await updateBasketDetails(sessionId, basketDetails);

      return {
        success: true,
        items,
        deliveryDetails: basketDetails.deliveryDetails || null,
      };
    }

    /**
     * removeItem
     */
    case 'removeItem': {
      const { itemIndex } = data;
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

    /**
     * updateQuantity
     */
    case 'updateQuantity': {
      const { itemIndex, quantity } = data;
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

    /**
     * updateCustomerDetails
     */
    case 'updateCustomerDetails': {
      const { customerDetails } = data;
      if (!customerDetails || typeof customerDetails !== 'object') {
        throw new Error('[updateSession] Invalid customerDetails object');
      }

      // Example validation
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
 * If `deliveryType` is set, recalc the shipping fee from DB
 */
async function recalcDeliveryFee(basketDetails: BasketDetails) {
  if (!basketDetails.deliveryDetails?.deliveryType || !basketDetails.deliveryDetails.provider) {
    return;
  }
  const provider = basketDetails.deliveryDetails.provider;
  const deliveryOption = basketDetails.deliveryDetails.deliveryType; // e.g. 'homeDelivery'
  const weight = await calculateTotalBasketWeight(basketDetails.items ?? []);

  const fee = await getDbDeliveryFee(provider, deliveryOption, weight);
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

  // Example packaging add
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
 * Calculate total basket weight by fetching each drink's 'size' from DB
 */
async function calculateTotalBasketWeight(items: BasketItem[]): Promise<number> {
  let totalWeight = 0;

  // sum how many of each slug
  const slugCountMap: Record<string, number> = {};
  for (const item of items) {
    if (!item.selectedDrinks) continue;
    for (const [drinkSlug, count] of Object.entries(item.selectedDrinks)) {
      slugCountMap[drinkSlug] = (slugCountMap[drinkSlug] || 0) + count * item.quantity;
    }
  }

  const allSlugs = Object.keys(slugCountMap);
  if (!allSlugs.length) return 0;

  // fetch them from DB
  const { data: drinkRows, error } = await supabaseAdmin
    .from('drinks')
    .select('slug, size')
    .in('slug', allSlugs);

  if (error) {
    throw new Error(`[updateSession] Error fetching drinks: ${error.message}`);
  }

  for (const row of drinkRows ?? []) {
    const count = slugCountMap[row.slug] || 0;
    const weightPerUnit = approximateWeightFromSize(row.size || '');
    totalWeight += weightPerUnit * count;
  }

  return totalWeight;
}

/**
 * Query the DB for the appropriate shipping fee bracket
 */
async function getDbDeliveryFee(
  provider: string,          // e.g. 'postnord' / 'gls'
  deliveryType: string,      // e.g. 'homeDelivery' / 'pickupPoint'
  weightKg: number
): Promise<number> {
  // 1) We want to find the row(s) in postal_service for that provider + type,
  // ordered by max_weight ascending
  const { data: rows, error } = await supabaseAdmin
    .from('postal_service')
    .select('max_weight, fee')
    .eq('provider', provider)
    .eq('delivery_type', deliveryType)
    .order('max_weight', { ascending: true });

  if (error) {
    throw new Error(`[updateSession] Error fetching postal_service: ${error.message}`);
  }
  if (!rows || rows.length === 0) {
    // fallback or throw
    throw new Error(`[updateSession] No postal_service rows found for provider=${provider}, type=${deliveryType}`);
  }

  // 2) find the bracket
  let chosenFee = rows[rows.length - 1].fee; // default to largest bracket
  for (const r of rows) {
    if (weightKg <= Number(r.max_weight)) {
      chosenFee = r.fee;
      break;
    }
  }
  return chosenFee;
}
