// pages/api/admin/replaceData.js

import { admin, db } from '../../../lib/firebaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify the ID token passed in the request
    const { idToken, data } = req.body;
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Check if the user is an admin (custom claim)
    if (!decodedToken.admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete existing collections
    await deleteCollection('packages');
    await deleteCollection('drinks');

    // Upload new data
    const { packages: newPackages, drinks: newDrinks } = data;

    // Add new packages
    for (const pkgKey in newPackages) {
      const pkgData = newPackages[pkgKey];
      await db.collection('packages').doc(pkgKey).set(pkgData);
    }

    // Add new drinks
    for (const drinkKey in newDrinks) {
      const drinkData = newDrinks[drinkKey];
      await db.collection('drinks').doc(drinkKey).set(drinkData);
    }

    return res.status(200).json({ message: 'Data updated successfully' });
  } catch (error) {
    console.error('Error updating data:', error);
    return res.status(500).json({ error: 'Failed to update data' });
  }
}

// Helper function to delete a collection
async function deleteCollection(collectionName) {
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    return;
  }

  const batchSize = snapshot.size;
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}
