// /pages/api/getPackagePrice.js
import { db } from '../../lib/firebaseAdmin'; // Use firebaseAdmin to access Firestore securely
import { doc, getDoc } from 'firebase-admin/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { selectedProducts, selectedSize } = req.body;

  if (!selectedProducts || !selectedSize) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  try {
    let totalPrice = 0;

    // Fetch salePrice for each drink from drinks_private
    for (const [drinkSlug, qty] of Object.entries(selectedProducts)) {
      const drinkDocRef = db.collection('drinks_private').doc(drinkSlug);
      const drinkDocSnap = await drinkDocRef.get();

      if (!drinkDocSnap.exists) {
        return res.status(400).json({ error: `Drink ${drinkSlug} not found.` });
      }

      const drinkData = drinkDocSnap.data();

      if (!drinkData.salePrice) {
        return res.status(400).json({ error: `salePrice not found for ${drinkSlug}.` });
      }

      totalPrice += parseInt(drinkData.salePrice) * qty;
    }

    // Apply discounts based on package size
    let discount = 0;
    if (parseInt(selectedSize) === 12) {
      discount = 0.05; // 5% discount
    } else if (parseInt(selectedSize) === 18) {
      discount = 0.10; // 10% discount
    }

    let discountedPrice = totalPrice * (1 - discount);

    // Round up to the nearest number ending with 0
    let roundedPrice = Math.ceil(discountedPrice / 10) * 10;

    return res.status(200).json({ price: roundedPrice, discount });
  } catch (error) {
    console.error('Error calculating package price:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
