// pages/api/addToBasket.js

import { db } from '../../lib/firebaseAdmin';
import cookie from 'cookie';

export default async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).end(); // Method Not Allowed
    }

    const cookies = cookie.parse(req.headers.cookie || '');
    const consentAndSessionId  = cookies.consent_and_session_id;

    if (!consentAndSessionId) {
      return res.status(400).json({ error: 'Missing consentAndSessionId in cookies' });
    }

    const { item } = req.body; // Expected to contain packageSlug, selectedSize, selectedProducts, quantity

    const { packageSlug, selectedSize, selectedProducts, quantity } = item;

    // Fetch package details
    const packageDoc = await db.collection('packages').doc(packageSlug).get();
    if (!packageDoc.exists) {
      return res.status(400).json({ error: 'Invalid packageSlug' });
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

    // Get current basket
    const sessionDocRef = db.collection('sessions').doc(consentAndSessionId);
    const sessionDoc = await sessionDocRef.get();
    let basketDetails = {};
    if (sessionDoc.exists) {
      basketDetails = sessionDoc.data().basketDetails || {};
    }

    // Update basket items
    let items = basketDetails.items || [];

    // Check for existing item
    const existingItemIndex = items.findIndex(
      (basketItem) =>
        basketItem.packageSlug === packageSlug &&
        basketItem.packages_size === selectedSize &&
        isSameSelection(basketItem.selectedDrinks, selectedProducts)
    );

    if (existingItemIndex >= 0) {
      items[existingItemIndex].quantity += quantity;
    } else {
      items.push({
        packageSlug,
        quantity,
        packages_size: selectedSize,
        selectedDrinks: selectedProducts,
        pricePerPackage,
        recyclingFeePerPackage,
        totalPrice,
        totalRecyclingFee,
      });
    }

    // Update basketDetails
    basketDetails.items = items;

    // Update the session document
    await sessionDocRef.set({ basketDetails }, { merge: true });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error adding item to basket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

function isSameSelection(a, b) {
  const aEntries = Object.entries(a).sort();
  const bEntries = Object.entries(b).sort();
  return JSON.stringify(aEntries) === JSON.stringify(bEntries);
}

async function calculatePrice({ packageData, selectedSize, selectedProducts }) {
  // Implement your logic to calculate the price and recycling fee based on the package data
  // For demonstration, we'll use dummy values

  const pricePerPackage = 16000; // 160.00 kr
  const recyclingFeePerPackage = 800; // 8.00 kr

  return { pricePerPackage, recyclingFeePerPackage };
}
