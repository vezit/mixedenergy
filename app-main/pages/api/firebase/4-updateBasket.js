// pages/api/updateBasket.js

import { db } from '../../../lib/firebaseAdmin';
import cookie from 'cookie';

export default async (req, res) => {
  try {
    const method = req.method;

    if (method !== 'POST') {
      return res.status(405).end(); // Method Not Allowed
    }

    const cookies = cookie.parse(req.headers.cookie || '');
    const consentId = cookies.cookie_consent_id;

    if (!consentId) {
      return res.status(400).json({ error: 'Missing consentId in cookies' });
    }

    const { action, itemIndex, quantity } = req.body;

    if (!['updateQuantity', 'removeItem'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const sessionDocRef = db.collection('sessions').doc(consentId);
    const sessionDoc = await sessionDocRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessionDoc.data();
    const basketDetails = sessionData.basketDetails || {};
    const items = basketDetails.items || [];

    if (itemIndex < 0 || itemIndex >= items.length) {
      return res.status(400).json({ error: 'Invalid item index' });
    }

    if (action === 'updateQuantity') {
      if (quantity < 1) {
        return res.status(400).json({ error: 'Quantity must be at least 1' });
      }

      // Recalculate price based on new quantity
      const item = items[itemIndex];
      const { packageSlug, packages_size, selectedDrinks } = item;

      // Compute price and recycling fee
      const { pricePerPackage, recyclingFeePerPackage } = await calculatePrice({
        packageSlug,
        packages_size,
        selectedDrinks,
      });

      items[itemIndex].quantity = quantity;
      items[itemIndex].totalPrice = pricePerPackage * quantity;
      items[itemIndex].totalRecyclingFee = recyclingFeePerPackage * quantity;
    } else if (action === 'removeItem') {
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

async function calculatePrice({ packageSlug, packages_size, selectedDrinks }) {
  // Fetch package details
  const packageDoc = await db.collection('packages').doc(packageSlug).get();
  if (!packageDoc.exists) {
    throw new Error('Package not found');
  }
  const packageData = packageDoc.data();

  // Implement your logic to calculate the price and recycling fee
  const pricePerPackage = 16000; // 160.00 kr
  const recyclingFeePerPackage = 800; // 8.00 kr

  return { pricePerPackage, recyclingFeePerPackage };
}
