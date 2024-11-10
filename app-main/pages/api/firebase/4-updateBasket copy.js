// pages/api/firebase/4-updateBasket.js

import { db } from '../../../lib/firebaseAdmin';
import cookie from 'cookie';

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

    if (!['addItem', 'updateQuantity', 'removeItem'].includes(action)) {
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

    if (action === 'addItem') {
      const { item } = req.body; // Expected to contain slug, selectedSize, selectedProducts, quantity
      const { slug, selectedSize, selectedProducts, quantity } = item;

      // Fetch package details
      const packageDoc = await db.collection('packages').doc(slug).get();
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

      // Check for existing item
      const existingItemIndex = items.findIndex(
        (basketItem) =>
          basketItem.slug === slug &&
          basketItem.packages_size === selectedSize &&
          isSameSelection(basketItem.selectedDrinks, selectedProducts)
      );

      if (existingItemIndex >= 0) {
        items[existingItemIndex].quantity += quantity;
        items[existingItemIndex].totalPrice += totalPrice;
        items[existingItemIndex].totalRecyclingFee += totalRecyclingFee;
      } else {
        items.push({
          slug,
          quantity,
          packages_size: selectedSize,
          selectedDrinks: selectedProducts,
          pricePerPackage,
          recyclingFeePerPackage,
          totalPrice,
          totalRecyclingFee,
        });
      }

    } else if (action === 'updateQuantity') {
      const { itemIndex, quantity } = req.body;

      if (typeof itemIndex !== 'number' || itemIndex < 0 || itemIndex >= items.length) {
        return res.status(400).json({ error: 'Invalid item index' });
      }

      if (quantity < 1) {
        return res.status(400).json({ error: 'Quantity must be at least 1' });
      }

      // Recalculate price based on new quantity
      const item = items[itemIndex];
      const { slug, packages_size, selectedDrinks } = item;

      // Compute price and recycling fee
      const { pricePerPackage, recyclingFeePerPackage } = await calculatePrice({
        packageData: await db.collection('packages').doc(slug).get().then(doc => doc.data()),
        selectedSize: packages_size,
        selectedProducts: selectedDrinks,
      });

      items[itemIndex].quantity = quantity;
      items[itemIndex].pricePerPackage = pricePerPackage;
      items[itemIndex].recyclingFeePerPackage = recyclingFeePerPackage;
      items[itemIndex].totalPrice = pricePerPackage * quantity;
      items[itemIndex].totalRecyclingFee = recyclingFeePerPackage * quantity;

    } else if (action === 'removeItem') {
      const { itemIndex } = req.body;

      if (typeof itemIndex !== 'number' || itemIndex < 0 || itemIndex >= items.length) {
        return res.status(400).json({ error: 'Invalid item index' });
      }

      items.splice(itemIndex, 1);
    }

    // Update the basket in the session
    await sessionDocRef.update({
      'basketDetails.items': items,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating basket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

function isSameSelection(a, b) {
  const aEntries = Object.entries(a).sort();
  const bEntries = Object.entries(b).sort();
  return JSON.stringify(aEntries) === JSON.stringify(bEntries);
}

async function calculatePrice({ packageData, selectedSize, selectedProducts }) {
  // Fetch all drinks data
  const drinksCollection = await db.collection('drinks').get();
  const drinksData = {};
  drinksCollection.forEach(doc => {
    drinksData[doc.id] = doc.data();
  });

  const selectedDrinkSlugs = Object.keys(selectedProducts);

  let totalDrinkPrice = 0;
  let totalRecyclingFee = 0;
  let totalQuantity = 0;

  for (const slug of selectedDrinkSlugs) {
    const quantity = selectedProducts[slug];
    const drinkData = drinksData[slug];

    if (!drinkData) {
      throw new Error(`Drink not found: ${slug}`);
    }

    const salePrice = drinkData._salePrice; // Price in cents
    const recyclingFee = drinkData.recyclingFee || 0; // Recycling fee in cents

    totalDrinkPrice += salePrice * quantity;
    totalRecyclingFee += recyclingFee * quantity;
    totalQuantity += quantity;
  }

  // Ensure totalQuantity matches selectedSize
  if (totalQuantity !== selectedSize) {
    throw new Error('Total quantity of selected drinks does not match the package size');
  }

  // Apply package discount
  const packageOption = packageData.packages.find(pkg => pkg.size === selectedSize);
  if (!packageOption) {
    throw new Error('Invalid package size selected');
  }
  const discount = packageOption.discount || 1; // Default to no discount if not specified

  const pricePerPackage = Math.round(totalDrinkPrice * discount);
  const recyclingFeePerPackage = totalRecyclingFee; // Recycling fee is not discounted

  return { pricePerPackage, recyclingFeePerPackage };
}
