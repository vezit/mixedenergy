// pages/api/admin/replaceData.js

import { admin, db } from '../../../lib/firebaseAdmin';

export default async function handler(req, res) {
  console.log('API Route Hit: /api/admin/replaceData');
  
  if (req.method !== 'POST') {
    console.log('Method not allowed');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify the ID token passed in the request
    const { idToken, data } = req.body;
    console.log('Received idToken:', !!idToken);
    console.log('Received data:', !!data);

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log('Decoded token:', decodedToken);

    // Check if the user is an admin (custom claim)
    if (!decodedToken.admin) {
      console.log('User is not admin');
      return res.status(403).json({ error: 'Unauthorized' });
    }
    console.log('User is admin');

    // Delete existing collections
    console.log('Deleting collections...');
    await deleteCollection('packages');
    await deleteCollection('drinks');
    console.log('Collections deleted');

    // Upload new data
    const { packages: newPackages, drinks: newDrinks } = data;
    console.log('Number of packages to add:', Object.keys(newPackages).length);
    console.log('Number of drinks to add:', Object.keys(newDrinks).length);

    // Add new packages
    for (const pkgKey in newPackages) {
      const pkgData = newPackages[pkgKey];
      await db.collection('packages').doc(pkgKey).set(pkgData);
      console.log(`Added package: ${pkgKey}`);
    }

    // Add new drinks
    for (const drinkKey in newDrinks) {
      const drinkData = newDrinks[drinkKey];
      await db.collection('drinks').doc(drinkKey).set(drinkData);
      console.log(`Added drink: ${drinkKey}`);
    }

    console.log('Data uploaded successfully');
    return res.status(200).json({ message: 'Data updated successfully' });
  } catch (error) {
    console.error('Error updating data:', error);

    // For debugging purposes, send the error message back
    return res.status(500).json({ error: 'Failed to update data', message: error.message });
  }
}

// Helper function to delete a collection
async function deleteCollection(collectionName) {
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    console.log(`Collection ${collectionName} is already empty`);
    return;
  }

  const batchSize = snapshot.size;
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`Deleted ${batchSize} documents from ${collectionName}`);
}
