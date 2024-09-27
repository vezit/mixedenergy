// /pages/management/index.js

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useRouter } from 'next/router';
import { firebaseApp } from '../../lib/firebase'; // Adjust the path as needed

export default function ManagementPage() {
  const [drinks, setDrinks] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/management/login');
      } else if (user.email !== 'management@mixedenergy.dk') {
        router.push('/');
      } else {
        setLoading(false); // User is authenticated and is admin
      }
    });

    return () => unsubscribe();
  }, [auth, router]);

  useEffect(() => {
    if (!loading) {
      const fetchData = async () => {
        const drinksSnapshot = await getDocs(collection(db, 'drinks'));
        setDrinks(drinksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const packagesSnapshot = await getDocs(collection(db, 'packages'));
        setPackages(packagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      };

      fetchData();
    }
  }, [db, loading]);

  // ... rest of the component
}
