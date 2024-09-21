import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
// import serviceAccount from '../../../lib/firebaseAdminKey.json'; // Adjust the path accordingly

let serviceAccount;

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
  console.log(serviceAccount);
  
} catch (error) {
  console.error('Error parsing FIREBASE_ADMIN_KEY:', error);
}
// Initialize Firebase Admin
const firebaseAdminApp = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(firebaseAdminApp);

export default async function handler(req, res) {
  try {
    const querySnapshot = await db.collection('helloworld').get();
    const data = [];
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data from Firestore' });
  }
}
