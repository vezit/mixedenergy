// pages/api/supabase/4-updateBasket.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'cookie';
import { supabaseAdmin } from '../../../lib/api/supabaseAdmin';
import { calculatePrice } from '../../../lib/priceCalculations';

// Data interfaces
interface SessionRow {
  session_id: string;
  basket_details: BasketDetails;
  temporary_selections?: Record<string, any>;
}

interface BasketDetails {
  items?: BasketItem[];
  customerDetails?: CustomerDetails;
  deliveryDetails?: DeliveryDetails;
}

interface BasketItem {
  slug: string;
  quantity: number;
  packages_size: number;
  selectedDrinks: Record<string, number>;
  pricePerPackage: number;
  recyclingFeePerPackage: number;
  totalPrice: number;
  totalRecyclingFee: number;
  sugarPreference?: string;
}

interface CustomerDetails {
  fullName?: string | null;
  mobileNumber?: string | null;
  email?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  [key: string]: any;
}

interface DeliveryDetails {
  provider?: string;
  trackingNumber?: string | null;
  estimatedDeliveryDate?: string | null;
  deliveryType?: string;  // e.g. 'homeDelivery', 'pickupPoint'
  deliveryFee?: number;   // in øre
  currency?: string;
  deliveryAddress?: any;  // your address structure
  providerDetails?: any;  // e.g. {postnord:{...}, gls:{...}}
  createdAt?: string;
}

/**
 * MAIN HANDLER for "/api/supabase/4-updateBasket"
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 1) Parse sessionId from cookie or body
    const cookiesHeader = req.headers.cookie;
    const parsedCookies = cookiesHeader ? parse(cookiesHeader) : {};
    const sessionId = parsedCookies['session_id'] || req.body.sessionId;

    if (!sessionId) {
      return res.status(400).json({ error: 'No session ID provided (cookie or body)' });
    }

    // 2) Fetch the session row
    const { data: sessionRow, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('session_id, basket_details, temporary_selections')
      .eq('session_id', sessionId)
      .single<SessionRow>();

    if (sessionError) {
      console.error('[4-updateBasket] Session fetch error:', sessionError);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!sessionRow) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // 3) Extract basket details
    const basketDetails: BasketDetails = sessionRow.basket_details || {};
    let items: BasketItem[] = basketDetails.items || [];

    // 4) Read "action"
    const { action } = req.body;
    if (!action) {
      return res.status(400).json({ error: 'Missing action in request body' });
    }

    // --------------------------------------------------
    // ACTION: addItem
    // --------------------------------------------------
    if (action === 'addItem') {
      const { selectionId, quantity } = req.body;
      if (!selectionId) {
        return res.status(400).json({ error: 'Missing selectionId' });
      }
      if (!quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Quantity must be > 0' });
      }

      // 1) Retrieve the selection from temporary_selections
      const tempSelections = sessionRow.temporary_selections || {};
      const selection = tempSelections[selectionId];
      if (!selection) {
        return res.status(400).json({ error: 'Invalid or expired selectionId' });
      }

      const {
        selectedProducts, // e.g. { "faxe-kondi-booster-sort-zero": 2, ... }
        sugarPreference,
        selectedSize,
        packageSlug,
      } = selection;

      // 2) Fetch the main package row
      const { data: pkgRow, error: pkgError } = await supabaseAdmin
        .from('packages')
        .select('id, slug, title, description, image, category')
        .eq('slug', packageSlug)
        .single();

      if (pkgError) {
        console.error('[4-updateBasket] Error fetching package:', pkgError);
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!pkgRow) {
        return res.status(400).json({ error: 'Invalid package slug' });
      }

      // 2a) Also fetch the package_sizes for this package
      const { data: sizeRows, error: sizeError } = await supabaseAdmin
        .from('package_sizes')
        .select('size, discount, round_up_or_down')
        .eq('package_id', pkgRow.id);

      if (sizeError) {
        console.error('[4-updateBasket] Error fetching package_sizes:', sizeError);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Create array of { size, discount, roundUpOrDown }
      const packages = (sizeRows ?? []).map((row) => ({
        size: row.size,
        discount: row.discount ? Number(row.discount) : undefined,
        roundUpOrDown: row.round_up_or_down || 5,
      }));

      // 3) Fetch the selected drinks from "drinks"
      const drinkSlugs = Object.keys(selectedProducts);
      const { data: drinkRows, error: drinksError } = await supabaseAdmin
        .from('drinks')
        .select('slug, sale_price, recycling_fee')
        .in('slug', drinkSlugs);

      if (drinksError) {
        console.error('[4-updateBasket] Error fetching drinks:', drinksError);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Build a { [slug]: { sale_price, recycling_fee } } object
      const drinksData: Record<string, { sale_price: number; recycling_fee?: number }> = {};
      for (const row of drinkRows ?? []) {
        drinksData[row.slug] = {
          sale_price: row.sale_price,
          recycling_fee: row.recycling_fee ?? 0,
        };
      }

      // 4) Calculate the price for ONE package
      const { pricePerPackage, recyclingFeePerPackage } = await calculatePrice({
        packageData: {
          ...pkgRow,
          // Attach the "packages" array so calculatePrice() can find size=8,12,18
          packages,
        },
        selectedSize,
        selectedProducts,
        drinksData,
      });

      // Multiply by quantity
      const totalPrice = pricePerPackage * quantity;
      const totalRecyclingFee = recyclingFeePerPackage * quantity;

      // 5) Check if a similar item already exists in the basket
      let itemFound = false;
      for (const item of items) {
        if (
          item.slug === packageSlug &&
          item.packages_size === selectedSize &&
          isSameSelection(item.selectedDrinks, selectedProducts)
        ) {
          // Update existing item
          item.quantity += quantity;
          item.totalPrice += totalPrice;
          item.totalRecyclingFee += totalRecyclingFee;
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

      // 6) Recalc shipping if set
      await recalcDeliveryFee(basketDetails);

      // 7) Update DB
      await updateBasketDetails(sessionId, basketDetails);

      return res.status(200).json({
        success: true,
        items,
        deliveryDetails: basketDetails.deliveryDetails || null,
      });
    }

    // --------------------------------------------------
    // ACTION: removeItem
    // --------------------------------------------------
    else if (action === 'removeItem') {
      const { itemIndex } = req.body;
      if (
        itemIndex === undefined ||
        itemIndex < 0 ||
        itemIndex >= items.length
      ) {
        return res.status(400).json({ error: 'Invalid item index' });
      }

      items.splice(itemIndex, 1);
      basketDetails.items = items;
      await recalcDeliveryFee(basketDetails);
      await updateBasketDetails(sessionId, basketDetails);

      return res.status(200).json({
        success: true,
        items,
        deliveryDetails: basketDetails.deliveryDetails || null,
      });
    }

    // --------------------------------------------------
    // ACTION: updateQuantity
    // --------------------------------------------------
    else if (action === 'updateQuantity') {
      const { itemIndex, quantity } = req.body;
      if (
        itemIndex === undefined ||
        itemIndex < 0 ||
        itemIndex >= items.length
      ) {
        return res.status(400).json({ error: 'Invalid item index' });
      }
      if (!quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Quantity must be greater than zero' });
      }

      const item = items[itemIndex];
      item.quantity = quantity;
      item.totalPrice = item.pricePerPackage * quantity;
      item.totalRecyclingFee = item.recyclingFeePerPackage * quantity;

      basketDetails.items = items;
      await recalcDeliveryFee(basketDetails);
      await updateBasketDetails(sessionId, basketDetails);

      return res.status(200).json({
        success: true,
        items,
        deliveryDetails: basketDetails.deliveryDetails || null,
      });
    }

    // --------------------------------------------------
    // ACTION: updateCustomerDetails
    // --------------------------------------------------
    else if (action === 'updateCustomerDetails') {
      const { customerDetails } = req.body;
      if (!customerDetails || typeof customerDetails !== 'object') {
        return res.status(400).json({ error: 'Invalid customerDetails format' });
      }

      basketDetails.customerDetails = {
        ...(basketDetails.customerDetails || {}),
        ...customerDetails,
      };
      await updateBasketDetails(sessionId, basketDetails);

      return res.status(200).json({
        success: true,
        errors: {},
      });
    }

    // --------------------------------------------------
    // ACTION: Unknown
    // --------------------------------------------------
    else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error: any) {
    console.error('[4-updateBasket] Catch Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/** Update basket_details in DB */
async function updateBasketDetails(sessionId: string, newBasketDetails: BasketDetails) {
  const { error } = await supabaseAdmin
    .from('sessions')
    .update({ basket_details: newBasketDetails })
    .eq('session_id', sessionId);

  if (error) {
    console.error('[4-updateBasket] Error updating basket_details:', error);
    throw new Error('Internal server error');
  }
}

/** Re-check total weight and set `deliveryFee` if a delivery method is set. */
async function recalcDeliveryFee(basketDetails: BasketDetails) {
  if (!basketDetails.deliveryDetails?.deliveryType) {
    return; // no shipping chosen
  }
  const weight = await calculateTotalBasketWeight(basketDetails.items ?? []);
  const fee = getDeliveryFee(weight, basketDetails.deliveryDetails.deliveryType);
  basketDetails.deliveryDetails.deliveryFee = fee;
}

/** Compare two "selectedDrinks" objects for equality. */
function isSameSelection(a: Record<string, number>, b: Record<string, number>) {
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false;
    if (a[aKeys[i]] !== b[bKeys[i]]) return false;
  }
  return true;
}

/** Approximate weight from a drink "size" string (e.g. "0.5 l") */
function approximateWeightFromSize(sizeString: string): number {
  const volumeMatch = sizeString.match(/([\d.]+)\s*l/);
  if (!volumeMatch) return 0;
  const volumeLiters = parseFloat(volumeMatch[1]);
  // ~1 liter = ~1kg, plus packaging
  let weight = volumeLiters;
  if (volumeLiters === 0.5) {
    weight += 0.02;
  } else if (volumeLiters === 0.25) {
    weight += 0.015;
  } else {
    weight += 0.04 * volumeLiters;
  }
  return weight;
}

/** Calculate total basket weight by fetching each drink's `size` from DB. */
async function calculateTotalBasketWeight(items: BasketItem[]): Promise<number> {
  let totalWeight = 0;
  const slugCountMap: Record<string, number> = {};

  // gather how many of each drink
  for (const item of items) {
    const { selectedDrinks, quantity } = item;
    for (const [drinkSlug, count] of Object.entries(selectedDrinks)) {
      slugCountMap[drinkSlug] = (slugCountMap[drinkSlug] || 0) + count * quantity;
    }
  }

  const allSlugs = Object.keys(slugCountMap);
  if (!allSlugs.length) return 0;

  // fetch drinks for "size"
  const { data: drinkRows, error } = await supabaseAdmin
    .from('drinks')
    .select('slug, size')
    .in('slug', allSlugs);

  if (error) {
    throw new Error(`[4-updateBasket] Error fetching drinks: ${error.message}`);
  }

  for (const row of drinkRows ?? []) {
    const count = slugCountMap[row.slug] || 0;
    const weightPerUnit = approximateWeightFromSize(row.size || '');
    totalWeight += weightPerUnit * count;
  }

  return totalWeight;
}

/** Return shipping fee in øre */
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
  return bracket ? bracket.fee : feeTable[feeTable.length - 1].fee;
}
