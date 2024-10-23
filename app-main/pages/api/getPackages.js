import { db } from '../../lib/firebaseAdmin';

export default async (req, res) => {
  try {
    const packagesRef = db.collection('packages');
    const snapshot = await packagesRef.get();

    const packages = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      packages.push({ id: doc.id, ...data });
    });

    res.status(200).json({ packages });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};