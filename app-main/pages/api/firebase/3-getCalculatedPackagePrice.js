// pages/api/getPackagePrice.js

import { db } from '../../../lib/firebaseAdmin';

export default async (req, res) => {
  try {
    const { selectedProducts, selectedSize, slug } = req.body;

    // Fetch the package data
    const packageRef = db.collection('packages').doc(slug);
    const packageDoc = await packageRef.get();

    if (!packageDoc.exists) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const packageData = packageDoc.data();

    // Fetch drinks data including sensitive fields
    const drinkSlugs = Object.keys(selectedProducts);
    const drinksData = {};
    for (const drinkSlug of drinkSlugs) {
      const drinkRef = db.collection('drinks').doc(drinkSlug);
      const drinkDoc = await drinkRef.get();

      if (!drinkDoc.exists) {
        return res.status(404).json({ error: `Drink ${drinkSlug} not found` });
      }

      drinksData[drinkSlug] = drinkDoc.data();
    }

    // Calculate total price before discount
    let originalTotalPrice = 0;
    for (const [drinkSlug, qty] of Object.entries(selectedProducts)) {
      const drink = drinksData[drinkSlug];
      const _salePrice = drink._salePrice; // In cents (e.g., 2000 for 20.00 kr)
      originalTotalPrice += _salePrice * qty;
    }

    // Apply package discount
    const packageInfo = packageData.packages.find(
      (pkg) => pkg.size === parseInt(selectedSize)
    );

    if (!packageInfo) {
      return res.status(400).json({ error: 'Invalid package size selected' });
    }

    const discountMultiplier = packageInfo.discount;
    let discountedPrice = originalTotalPrice * discountMultiplier;

    // Round up to the nearest multiple of 'roundTo' in kr
    const roundTo = packageInfo.roundUpOrDown || 5;
    discountedPrice = Math.ceil(discountedPrice / (roundTo * 100)) * (roundTo * 100);

    res.status(200).json({
      price: discountedPrice,
      originalPrice: originalTotalPrice,
    });
  } catch (error) {
    console.error('Error calculating package price:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
