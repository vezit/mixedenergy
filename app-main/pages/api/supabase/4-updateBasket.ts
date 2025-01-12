// /pages/api/supabase/updateBasket.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import cookie from 'cookie';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { calculatePrice } from '../../../lib/priceCalculations';

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
  deliveryType?: string;
  deliveryFee?: number;
  currency?: string;
  deliveryAddress?: any; // Adjust to your type
  providerDetails?: any; // Adjust to your type
  createdAt?: string;
}

// ---------- MAIN HANDLER ----------
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).end(); // Method Not Allowed
    }

    // 1) Parse cookies
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionId = cookies.session_id;
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId in cookies' });
    }

    // 2) Fetch the session row
    const { data: sessionRow, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('session_id, basket_details, temporary_selections')
      .eq('session_id', sessionId)
      .single<SessionRow>();

    if (sessionError) {
      console.error('Session fetch error:', sessionError);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!sessionRow) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // 3) Extract basket details
    const basketDetails: BasketDetails = sessionRow.basket_details || {};
    let items: BasketItem[] = basketDetails.items || [];

    // 4) Read `action` from request body
    const { action } = req.body;
    if (!action) {
      return res.status(400).json({ error: 'Missing action in request body' });
    }

    // -------------------------
    // ACTION: updateDeliveryDetails
    // -------------------------
    if (action === 'updateDeliveryDetails') {
      const { deliveryOption, deliveryAddress, providerDetails } = req.body;
      if (!deliveryOption || !deliveryAddress || !providerDetails) {
        return res.status(400).json({ error: 'Missing delivery details' });
      }

      // Calculate total weight and then the corresponding fee
      const totalWeight = await calculateTotalBasketWeight(items);
      const deliveryFee = getDeliveryFee(totalWeight, deliveryOption);

      const deliveryDetails: DeliveryDetails = {
        provider: 'postnord',
        trackingNumber: null,
        estimatedDeliveryDate: null,
        deliveryType: deliveryOption,
        deliveryFee,
        currency: 'DKK',
        deliveryAddress,
        providerDetails,
        createdAt: new Date().toISOString(),
      };

      basketDetails.deliveryDetails = deliveryDetails;

      await updateBasketDetails(sessionId, basketDetails);

      return res.status(200).json({ success: true });
    }

    // -------------------------
    // ACTION: addItem
    // -------------------------
    else if (action === 'addItem') {
      const { selectionId, quantity } = req.body;
      if (!selectionId) {
        return res.status(400).json({ error: 'Missing selectionId' });
      }

      // Retrieve the selection from temporary_selections
      const tempSelections = sessionRow.temporary_selections || {};
      const selection = tempSelections[selectionId];
      if (!selection) {
        return res
          .status(400)
          .json({ error: 'Invalid or expired selectionId' });
      }

      const {
        selectedProducts,
        sugarPreference,
        selectedSize,
        packageSlug,
      } = selection;

      // 1) Fetch package from Supabase
      const { data: pkgRow, error: pkgError } = await supabaseAdmin
        .from('packages')
        .select('*')
        .eq('slug', packageSlug)
        .single();

      if (pkgError) {
        console.error('Error fetching package:', pkgError);
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!pkgRow) {
        return res.status(400).json({ error: 'Invalid package slug' });
      }

      // 2) Compute price + recycling fee
      const {
        pricePerPackage,
        recyclingFeePerPackage,
      } = await calculatePrice({
        packageData: pkgRow,
        selectedSize,
        selectedProducts,
      });

      const totalPrice = pricePerPackage * quantity;
      const totalRecyclingFee = recyclingFeePerPackage * quantity;

      // 3) Check if a similar item already exists in basket
      let itemFound = false;
      for (const item of items) {
        if (
          item.slug === packageSlug &&
          item.packages_size === selectedSize &&
          isSameSelection(item.selectedDrinks, selectedProducts)
        ) {
          item.quantity += quantity;
          item.totalPrice += totalPrice;
          item.totalRecyclingFee += totalRecyclingFee;
          itemFound = true;
          break;
        }
      }

      // 4) If not found, push a new item
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

      // 5) Update the basket details
      basketDetails.items = items;
      await updateBasketDetails(sessionId, basketDetails);

      return res.status(200).json({ success: true });
    }

    // -------------------------
    // ACTION: removeItem
    // -------------------------
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
      await updateBasketDetails(sessionId, basketDetails);

      return res.status(200).json({ success: true });
    }

    // -------------------------
    // ACTION: updateQuantity
    // -------------------------
    else if (action === 'updateQuantity') {
      const { itemIndex, quantity } = req.body;
      if (
        itemIndex === undefined ||
        itemIndex < 0 ||
        itemIndex >= items.length
      ) {
        return res.status(400).json({ error: 'Invalid item index' });
      }
      if (quantity <= 0) {
        return res
          .status(400)
          .json({ error: 'Quantity must be greater than zero' });
      }

      const item = items[itemIndex];
      item.quantity = quantity;
      item.totalPrice = item.pricePerPackage * quantity;
      item.totalRecyclingFee = item.recyclingFeePerPackage * quantity;

      basketDetails.items = items;
      await updateBasketDetails(sessionId, basketDetails);

      return res.status(200).json({ success: true });
    }

    // -------------------------
    // ACTION: updateCustomerDetails
    // -------------------------
    else if (action === 'updateCustomerDetails') {
      const { customerDetails } = req.body;
      if (!customerDetails || typeof customerDetails !== 'object') {
        return res
          .status(400)
          .json({ error: 'Invalid customerDetails format' });
      }

      const allowedFields = [
        'fullName',
        'mobileNumber',
        'email',
        'address',
        'postalCode',
        'city',
      ];
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
            const mobileNumberRegex = /^\d{8}$/;
            if (!mobileNumberRegex.test(value)) {
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
            const postalCodeRegex = /^\d{4}$/;
            if (!postalCodeRegex.test(value)) {
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

      return res.status(200).json({ success: true, errors });
    }

    // -------------------------
    // ACTION: unknown
    // -------------------------
    else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error: any) {
    console.error('Error updating basket:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ---------- HELPER: Update the session's basket_details ----------
async function updateBasketDetails(sessionId: string, newBasketDetails: BasketDetails) {
  const { error } = await supabaseAdmin
    .from('sessions')
    .update({ basket_details: newBasketDetails })
    .eq('session_id', sessionId);

  if (error) {
    console.error('Error updating basket_details:', error);
    throw new Error('Internal server error');
  }
}

// ---------- HELPER: Compare two "selectedDrinks" objects ----------
function isSameSelection(a: Record<string, number>, b: Record<string, number>) {
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false;
    if (a[aKeys[i]] !== b[bKeys[i]]) return false;
  }

  return true;
}

// ---------- HELPER: Approximate weight from a drink "size" string (e.g. "0.5 l") ----------
function approximateWeightFromSize(sizeString: string): number {
  // Extract volume from something like "0.5 l"
  const volumeMatch = sizeString.match(/([\d.]+)\s*l/);
  if (!volumeMatch) return 0;

  const volumeLiters = parseFloat(volumeMatch[1]);
  // Approx: 1 liter of beverage ~ 1 kg
  let weight = volumeLiters;

  // Add packaging weight
  if (volumeLiters === 0.5) {
    weight += 0.02; // ~20g for packaging
  } else if (volumeLiters === 0.25) {
    weight += 0.015; // ~15g
  } else {
    weight += 0.04 * volumeLiters;
  }

  return weight; // in kg
}

// ---------- HELPER: Calculate total basket weight by fetching "drinks" from Supabase ----------
async function calculateTotalBasketWeight(items: BasketItem[]): Promise<number> {
  let totalWeight = 0;

  // Build up a map: { [drinkSlug]: quantity * item.quantity } but we also need each drink's size
  // We'll gather unique slugs and how many total cans/bottles are needed
  interface DrinkAccum {
    [slug: string]: {
      totalCount: number; // sum of all item.quantity * selectedProducts[slug]
      size: string | null; // we’ll fetch from the DB
    };
  }

  const slugMap: { [slug: string]: number } = {};

  // Step 1) Accumulate slugs & total counts
  for (const item of items) {
    const { selectedDrinks, quantity } = item;
    for (const [drinkSlug, count] of Object.entries(selectedDrinks)) {
      slugMap[drinkSlug] = (slugMap[drinkSlug] || 0) + count * quantity;
    }
  }

  const allSlugs = Object.keys(slugMap);
  if (!allSlugs.length) return 0;

  // Step 2) Fetch drinks from Supabase in one query
  const { data: drinkRows, error } = await supabaseAdmin
    .from('drinks')
    .select('slug, size')
    .in('slug', allSlugs);

  if (error) {
    throw new Error(`Error fetching drinks: ${error.message}`);
  }

  // Step 3) Calculate total weight
  for (const row of drinkRows ?? []) {
    const totalCount = slugMap[row.slug];
    const weightPerUnit = approximateWeightFromSize(row.size || '');
    totalWeight += weightPerUnit * totalCount;
  }

  return totalWeight;
}

// ---------- HELPER: Determine delivery fee based on weight + method ----------
function getDeliveryFee(weight: number, deliveryOption: string): number {
  // Example fee tables in øre (3200 = 32.00 DKK):
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
