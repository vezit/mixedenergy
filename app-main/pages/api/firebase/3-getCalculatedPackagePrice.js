// pages/api/firebase/3-getCalculatedPackagePrice.js

import { db } from '../../../lib/firebaseAdmin';
import { calculatePrice } from '../../../lib/priceCalculations';

export default async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).end(); // Method Not Allowed
    }

    const { selectedProducts, selectedSize, slug, isMysteryBox, sugarPreference } = req.body;

    // Fetch the package data
    const packageRef = db.collection('packages').doc(slug);
    const packageDoc = await packageRef.get();

    if (!packageDoc.exists) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const packageData = packageDoc.data();

    let productsToCalculate = selectedProducts;

    // Handle Mysterybox selection
    if (isMysteryBox) {
      // Fetch all drink slugs in the package
      const drinksSlugs = packageData.collectionsDrinks;

      // Fetch drinks from Firestore
      const drinksSnapshot = await db.collection('drinks').where('__name__', 'in', drinksSlugs).get();
      const allDrinks = {};
      drinksSnapshot.forEach((doc) => {
        allDrinks[doc.id] = doc.data();
      });

      // Filter drinks based on sugar preference
      const filteredDrinks = Object.entries(allDrinks).filter(([slug, data]) => {
        if (sugarPreference === 'med_sukker') return !data.isSugarFree;
        if (sugarPreference === 'uden_sukker') return data.isSugarFree;
        return true; // 'alle'
      });

      // Generate a random selection
      productsToCalculate = {};
      const drinkCount = filteredDrinks.length;
      const totalItems = selectedSize;

      for (let i = 0; i < totalItems; i++) {
        const randomIndex = Math.floor(Math.random() * drinkCount);
        const [drinkSlug] = filteredDrinks[randomIndex];
        productsToCalculate[drinkSlug] = (productsToCalculate[drinkSlug] || 0) + 1;
      }
    }

    // Calculate price using the utility function
    const { pricePerPackage, recyclingFeePerPackage, originalTotalPrice } = await calculatePrice({
      packageData,
      selectedSize,
      selectedProducts: productsToCalculate,
    });

    res.status(200).json({
      price: pricePerPackage,
      recyclingFeePerPackage,
      originalPrice: originalTotalPrice,
    });
  } catch (error) {
    console.error('Error calculating package price:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
