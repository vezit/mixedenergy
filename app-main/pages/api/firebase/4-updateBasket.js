// pages/api/firebase/4-updateBasket.js

import { admin, db } from '../../../lib/firebaseAdmin';
import cookie from 'cookie';
import { calculatePrice } from '../../../lib/priceCalculations';
// Remove the static DELIVERY_PRICES import since we now calculate based on weight.
// import { DELIVERY_PRICES } from '../../../lib/constants';

export default async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).end(); // Method Not Allowed
    }

    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionId = cookies.session_id;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId in cookies' });
    }

    const { action } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Missing action in request body' });
    }

    const sessionDocRef = db.collection('sessions').doc(sessionId);
    const sessionDoc = await sessionDocRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessionDoc.data();
    const basketDetails = sessionData.basketDetails || {};
    let items = basketDetails.items || [];

    if (action === 'updateDeliveryDetails') {
      const { deliveryOption, deliveryAddress, providerDetails } = req.body;

      if (!deliveryOption || !deliveryAddress || !providerDetails) {
        return res.status(400).json({ error: 'Missing delivery details' });
      }

      // Calculate total weight of all items
      const totalWeight = await calculateTotalBasketWeight(items);

      // Get the dynamic delivery fee based on weight and option
      const deliveryFee = getDeliveryFee(totalWeight, deliveryOption);

      const deliveryDetails = {
        provider: 'postnord',
        trackingNumber: null,
        estimatedDeliveryDate: null,
        deliveryType: deliveryOption,
        deliveryFee: deliveryFee,
        currency: 'DKK',
        deliveryAddress: deliveryAddress,
        providerDetails: providerDetails,
        createdAt: new Date().toISOString(),
      };

      await sessionDocRef.update({
        'basketDetails.deliveryDetails': deliveryDetails,
      });

      return res.status(200).json({ success: true });
    } else if (action === 'addItem') {
      // Handle 'addItem' action
      const { selectionId, quantity } = req.body;

      if (!selectionId) {
        return res.status(400).json({ error: 'Missing selectionId' });
      }

      const temporarySelections = sessionData.temporarySelections || {};
      const selection = temporarySelections[selectionId];

      if (!selection) {
        return res.status(400).json({ error: 'Invalid or expired selectionId' });
      }

      const { selectedProducts, sugarPreference, selectedSize, packageSlug } = selection;

      // Fetch package details
      const packageDoc = await db.collection('packages').doc(packageSlug).get();
      if (!packageDoc.exists) {
        return res.status(400).json({ error: 'Invalid package slug' });
      }
      const packageData = packageDoc.data();

      // Compute price and recycling fee
      const { pricePerPackage, recyclingFeePerPackage } = await calculatePrice({
        packageData,
        selectedSize,
        selectedProducts,
      });

      const totalPrice = pricePerPackage * quantity;
      const totalRecyclingFee = recyclingFeePerPackage * quantity;

      let itemFound = false;
      for (let item of items) {
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

      await sessionDocRef.update({
        'basketDetails.items': items,
      });

      return res.status(200).json({ success: true });
    } else if (action === 'removeItem') {
      const { itemIndex } = req.body;

      if (itemIndex === undefined || itemIndex < 0 || itemIndex >= items.length) {
        return res.status(400).json({ error: 'Invalid item index' });
      }

      items.splice(itemIndex, 1);

      await sessionDocRef.update({
        'basketDetails.items': items,
      });

      return res.status(200).json({ success: true });
    } else if (action === 'updateQuantity') {
      const { itemIndex, quantity } = req.body;

      if (itemIndex === undefined || itemIndex < 0 || itemIndex >= items.length) {
        return res.status(400).json({ error: 'Invalid item index' });
      }

      if (quantity <= 0) {
        return res.status(400).json({ error: 'Quantity must be greater than zero' });
      }

      let item = items[itemIndex];
      item.quantity = quantity;
      item.totalPrice = item.pricePerPackage * quantity;
      item.totalRecyclingFee = item.recyclingFeePerPackage * quantity;

      await sessionDocRef.update({
        'basketDetails.items': items,
      });

      return res.status(200).json({ success: true });
    } else if (action === 'updateCustomerDetails') {
      const { customerDetails } = req.body;

      if (!customerDetails || typeof customerDetails !== 'object') {
        return res.status(400).json({ error: 'Invalid customerDetails format' });
      }

      const allowedFields = ['fullName', 'mobileNumber', 'email', 'address', 'postalCode', 'city'];
      const errors = {};
      const updatedCustomerDetails = {};

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

      await sessionDocRef.set(
        {
          basketDetails: {
            customerDetails: updatedCustomerDetails,
          },
        },
        { merge: true }
      );

      return res.status(200).json({ success: true, errors });
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error updating basket:', error);
    res.status(500).json({ error: error.message });
  }
};

// Helper function to determine if two selections are the same
function isSameSelection(a, b) {
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) {
      return false;
    }
    if (a[aKeys[i]] !== b[bKeys[i]]) {
      return false;
    }
  }

  return true;
}

// Approximate weight calculation from size
function approximateWeightFromSize(sizeString) {
  // Extract volume in liters, assuming format like "0.5 l"
  const volumeMatch = sizeString.match(/([\d.]+)\s*l/);
  if (!volumeMatch) return 0;

  const volumeLiters = parseFloat(volumeMatch[1]);
  // Approximate: 1 liter of beverage ~ 1 kg
  let weight = volumeLiters;

  // Add packaging weight - rough estimate
  // Adjust these numbers as needed
  if (volumeLiters === 0.5) {
    weight += 0.02; // ~20g for packaging
  } else if (volumeLiters === 0.25) {
    weight += 0.015; // ~15g for smaller can
  } else {
    // For other sizes, scale packaging
    weight += 0.04 * volumeLiters; 
  }

  return weight; // in kg
}

// Calculate total basket weight
async function calculateTotalBasketWeight(items) {
  let totalWeight = 0;

  // For each item, we have selectedDrinks: { 'monster-energy': count, ... }
  // We need to fetch each drink data to get its size -> weight
  for (const item of items) {
    const selectedDrinks = item.selectedDrinks || {};
    const drinkSlugs = Object.keys(selectedDrinks);

    if (drinkSlugs.length === 0) continue;

    const drinkDocs = await Promise.all(
      drinkSlugs.map((slug) => db.collection('drinks').doc(slug).get())
    );

    for (let i = 0; i < drinkSlugs.length; i++) {
      const slug = drinkSlugs[i];
      const doc = drinkDocs[i];
      if (doc.exists) {
        const drinkData = doc.data();
        const count = selectedDrinks[slug];
        const weightPerUnit = approximateWeightFromSize(drinkData.size);
        totalWeight += weightPerUnit * count * item.quantity; 
        // item.quantity is the number of packages, and count is how many of that drink per package
      }
    }
  }

  return totalWeight;
}

// Determine delivery fee based on weight and delivery option
function getDeliveryFee(weight, deliveryOption) {
  // Example fee tables (in øre, e.g. 3200 = 32.00 kr)
  // Adjust as per your pricing
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

  let feeTable = deliveryOption === 'pickupPoint' ? pickupPointFees : homeDeliveryFees;
  const bracket = feeTable.find(b => weight <= b.maxWeight);

  // If no bracket found, use the highest fee
  if (!bracket) {
    return feeTable[feeTable.length - 1].fee;
  }

  return bracket.fee;
}
