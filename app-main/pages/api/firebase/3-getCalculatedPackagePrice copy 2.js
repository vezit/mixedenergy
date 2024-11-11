// pages/api/firebase/3-getCalculatedPackagePrice.js

import { db } from '../../../lib/firebaseAdmin';
import { calculatePrice } from '../../../lib/priceCalculations';

export default async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).end(); // Method Not Allowed
    }

    const { selectedProducts, selectedSize, slug } = req.body;

    // Fetch the package data
    const packageRef = db.collection('packages').doc(slug);
    const packageDoc = await packageRef.get();

    if (!packageDoc.exists) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const packageData = packageDoc.data();

    // Calculate price using the utility function
    const { pricePerPackage, recyclingFeePerPackage, originalTotalPrice } = await calculatePrice({
      packageData,
      selectedSize,
      selectedProducts,
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
