// pages/api/firebase/4-createTemporarySelection.js

import { db } from '../../../lib/firebaseAdmin';
import cookie from 'cookie';
import { v4 as uuidv4 } from 'uuid';
import { calculatePrice } from '../../../lib/priceCalculations';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).end(); // Method Not Allowed
    }

    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionId = cookies.session_id;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing session_id cookie' });
    }

    const { selectedProducts, selectedSize, packageSlug, isMysteryBox, sugarPreference } = req.body;

    if (!selectedProducts || !selectedSize || !packageSlug) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate total selected drinks
    const totalSelected = Object.values(selectedProducts).reduce((sum, qty) => sum + qty, 0);

    // Validate total selected matches selectedSize
    if (totalSelected !== parseInt(selectedSize)) {
      return res.status(400).json({ error: 'Selected products do not match package size' });
    }

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

    // Generate a selectionId
    const selectionId = uuidv4();

    // Store the temporary selection in the session
    const sessionDocRef = db.collection('sessions').doc(sessionId);
    await sessionDocRef.set(
      {
        temporarySelections: {
          [selectionId]: {
            selectedProducts,
            selectedSize,
            packageSlug,
            isMysteryBox,
            sugarPreference,
            createdAt: new Date(),
          },
        },
      },
      { merge: true }
    );

    res.status(200).json({
      success: true,
      selectionId,
      price: pricePerPackage, // Price for one package
    });
  } catch (error) {
    console.error('Error creating temporary selection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
