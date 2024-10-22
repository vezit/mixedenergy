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