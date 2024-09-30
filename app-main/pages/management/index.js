// /pages/management/index.js

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/router';
import { getFirestore, collection, getDocs } from 'firebase/firestore'; // Import Firestore functions
import { firebaseApp } from '../../lib/firebase'; // Import your Firebase app

export default function AdminPage() {
  const [loading, setLoading] = useState(true); // Initialize loading state
  const [drinks, setDrinks] = useState([]); // Initialize drinks state
  const [packages, setPackages] = useState([]); // Initialize packages state

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
        try {
          const drinksSnapshot = await getDocs(collection(db, 'drinks_public'));
          setDrinks(
            drinksSnapshot.docs.map((doc) => ({ docId: doc.id, ...doc.data() }))
          );

          const packagesSnapshot = await getDocs(collection(db, 'packages_public'));
          setPackages(
            packagesSnapshot.docs.map((doc) => ({ docId: doc.id, ...doc.data() }))
          );
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };

      fetchData();
    }
  }, [db, loading]);

  // ... rest of the component
}
