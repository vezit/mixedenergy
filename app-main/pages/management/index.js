// /pages/management/index.js
import { useEffect } from 'react';
// /pages/management/index.js

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/router';

export default function AdminPage() {
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
        const drinksSnapshot = await getDocs(collection(db, 'drinks_public'));
        setDrinks(drinksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const packagesSnapshot = await getDocs(collection(db, 'packages_public'));
        setPackages(packagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      };

      fetchData();
    }
  }, [db, loading]);

  // ... rest of the component
}
