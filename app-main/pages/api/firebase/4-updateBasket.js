// pages/api/firebase/4-updateBasket.js

import { admin, db } from '../../../lib/firebaseAdmin';
import cookie from 'cookie';
import { calculatePrice } from '../../../lib/priceCalculations';

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

    if (action !== 'addItem') {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const sessionDocRef = db.collection('sessions').doc(sessionId);
    const sessionDoc = await sessionDocRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessionDoc.data();
    const basketDetails = sessionData.basketDetails || {};
    let items = basketDetails.items || [];

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

    // Compute price and recycling fee using the utility function
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
        // Increment the quantity and update totalPrice and totalRecyclingFee
        item.quantity += quantity;
        item.totalPrice += totalPrice;
        item.totalRecyclingFee += totalRecyclingFee;
        itemFound = true;
        break;
      }
    }

    if (!itemFound) {
      // Add item to basket
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

    // Update the basket in the session
    await sessionDocRef.update({
      'basketDetails.items': items,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating basket:', error);
    res.status(500).json({ error: error.message });
  }
};

// Include the isSameSelection function here
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
