import { db } from '../../../lib/firebaseAdmin';
import { filterData } from '../../../lib/filterData';

export default async (req, res) => {
  try {
    const packagesRef = db.collection('packages');
    const snapshot = await packagesRef.get();

    const packages = [];
    snapshot.forEach((doc) => {

      const data = doc.data();
      const filteredData = filterData(data, 1);

      packages.push({ id: doc.id, ...filteredData });
    });





    res.status(200).json({ packages });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};