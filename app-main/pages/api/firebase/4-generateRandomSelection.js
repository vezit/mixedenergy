// pages/api/firebase/4-generateRandomSelection.js

import { admin, db } from '../../../lib/firebaseAdmin';
import cookie from 'cookie';
import { v4 as uuidv4 } from 'uuid';

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

    const { slug, selectedSize, sugarPreference = null, isCustomSelection = false, selectedProducts = null } = req.body;

    // Fetch package details
    const packageDoc = await db.collection('packages').doc(slug).get();
    if (!packageDoc.exists) {
      return res.status(400).json({ error: 'Invalid package slug' });
    }
    const packageData = packageDoc.data();

    // Fetch drinks data
    const drinksData = await getDrinksData(packageData.collectionsDrinks);

    let finalSelectedProducts = {};

    if (isCustomSelection && selectedProducts) {
      finalSelectedProducts = selectedProducts;
    } else {
      if (!sugarPreference) {
        return res.status(400).json({ error: 'Missing sugarPreference' });
      }
      // Generate random selection
      finalSelectedProducts = generateRandomSelection({
        drinksData,
        selectedSize,
        sugarPreference,
      });
    }

    // Store the selection in the session with a unique identifier
    const selectionId = uuidv4();
    const sessionDocRef = db.collection('sessions').doc(sessionId);
    await sessionDocRef.set(
      {
        temporarySelections: {
          [selectionId]: {
            selectedProducts: finalSelectedProducts,
            sugarPreference,
            selectedSize,
            packageSlug: slug,
            isCustomSelection,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        },
      },
      { merge: true }
    );

    res.status(200).json({ success: true, selectedProducts: finalSelectedProducts, selectionId });
  } catch (error) {
    console.error('Error generating random selection:', error);
    res.status(500).json({ error: error.message });
  }
};

async function getDrinksData(drinkSlugs) {
  // Ensure drinkSlugs is an array and has elements
  if (!Array.isArray(drinkSlugs) || drinkSlugs.length === 0) {
    throw new Error('No drinks available for the selected package.');
  }

  // Firestore 'in' queries can handle a maximum of 10 elements
  const chunks = [];
  for (let i = 0; i < drinkSlugs.length; i += 10) {
    chunks.push(drinkSlugs.slice(i, i + 10));
  }

  const drinksData = {};

  for (const chunk of chunks) {
    const drinksCollection = await db
      .collection('drinks')
      .where('__name__', 'in', chunk)
      .get();
    drinksCollection.forEach((doc) => {
      drinksData[doc.id] = doc.data();
    });
  }

  return drinksData;
}

function generateRandomSelection({ drinksData, selectedSize, sugarPreference }) {
  const randomSelection = {};
  let remaining = parseInt(selectedSize);

  // Filter drinks based on sugar preference
  let drinksCopy = Object.entries(drinksData).filter(([slug, drink]) => {
    if (!drink) return false;
    if (sugarPreference === 'uden_sukker' && !drink.isSugarFree) return false;
    if (sugarPreference === 'med_sukker' && drink.isSugarFree) return false;
    return true; // For 'alle', include all drinks
  });

  if (drinksCopy.length === 0) {
    throw new Error('No drinks match your sugar preference.');
  }

  while (remaining > 0) {
    const randomIndex = Math.floor(Math.random() * drinksCopy.length);
    const [drinkSlug, drink] = drinksCopy[randomIndex];
    if (!drink) {
      drinksCopy.splice(randomIndex, 1);
      continue;
    }
    const qty = 1; // Select one at a time
    randomSelection[drinkSlug] = (randomSelection[drinkSlug] || 0) + qty;
    remaining -= qty;
  }

  return randomSelection;
}
