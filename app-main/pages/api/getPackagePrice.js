// pages/api/getPackagePrice.js

import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_ADMIN_KEY)
    ),
  });
}
const db = admin.firestore();

export default async (req, res) => {
  try {
    const { selectedProducts, selectedSize, slug } = req.body;

    // Fetch the package data
    const packageRef = db.collection('packages_public').doc(slug);
    const packageDoc = await packageRef.get();

    if (!packageDoc.exists) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const packageData = packageDoc.data();
    const packageDetails = packageData.packages.find(
      (pkg) => pkg.size === selectedSize
    );

    if (!packageDetails) {
      return res.status(400).json({ error: 'Invalid package size selected' });
    }

    const { minPrice, priceJump, discount } = packageDetails;

    // Fetch drinks data
    const drinkSlugs = Object.keys(selectedProducts);
    const drinksSnapshot = await Promise.all(
      drinkSlugs.map((slug) => db.collection('drinks').doc(slug).get())
    );

    let totalCost = 0;

    drinksSnapshot.forEach((doc) => {
      if (doc.exists) {
        const drinkData = doc.data();
        const qty = selectedProducts[doc.id];
        const salePrice = drinkData.salePrice;
        totalCost += salePrice * qty;
      }
    });

    // Apply priceJump (if applicable)
    if (priceJump) {
      totalCost += priceJump * selectedSize;
    }

    // Apply discount (if applicable)
    if (discount) {
      totalCost = totalCost * discount;
    }

    // Ensure totalCost is not less than minPrice
    const finalPrice = Math.max(totalCost, minPrice);

    res.status(200).json({ price: Math.round(finalPrice) });
  } catch (error) {
    console.error('Error calculating package price:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
