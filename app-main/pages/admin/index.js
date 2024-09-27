// pages/admin/index.js

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useRouter } from 'next/router';
import firebaseApp from '../../lib/firebase'; // Adjust the path if necessary
import DrinksTable from '../../components/DrinksTable';
import PackagesTable from '../../components/PackagesTable';
import Modal from '../../components/Modal';

export default function AdminPage() {
  const [drinks, setDrinks] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadedData, setUploadedData] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const router = useRouter();
  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/admin/login');
      } else if (user.email !== 'management@mixedenergy.dk') {
        router.push('/');
      } else {
        setLoading(false); // User is authenticated and is admin
      }
    });

    return () => unsubscribe();
  }, [auth, router]);

  const fetchData = async () => {
    const drinksSnapshot = await getDocs(collection(db, 'drinks'));
    setDrinks(drinksSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));

    const packagesSnapshot = await getDocs(collection(db, 'packages'));
    setPackages(packagesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
  };

  useEffect(() => {
    if (!loading) {
      fetchData();
    }
  }, [db, loading]);

  // Handle changes in drinks data
  const handleDrinkChange = (drinkId, path, value) => {
    const updatedDrinks = drinks.map((drink) => {
      if (drink.id === drinkId) {
        const updatedDrink = { ...drink };
        updateNestedData(updatedDrink, path, value);
        return updatedDrink;
      } else {
        return drink;
      }
    });
    setDrinks(updatedDrinks);
  };

  // Handle changes in packages data
  const handlePackageChange = (pkgId, path, value) => {
    const updatedPackages = packages.map((pkg) => {
      if (pkg.id === pkgId) {
        const updatedPackage = { ...pkg };
        updateNestedData(updatedPackage, path, value);
        return updatedPackage;
      } else {
        return pkg;
      }
    });
    setPackages(updatedPackages);
  };

  // Recursive function to update nested data
  const updateNestedData = (obj, pathArray, value) => {
    if (pathArray.length === 1) {
      obj[pathArray[0]] = value;
    } else {
      const key = pathArray[0];
      if (!obj[key]) obj[key] = {};
      updateNestedData(obj[key], pathArray.slice(1), value);
    }
  };

  const saveDrink = async (drink) => {
    const drinkRef = doc(db, 'drinks', drink.id);
    try {
      await updateDoc(drinkRef, drink); // Save the entire drink object
      alert('Drink saved successfully');
    } catch (error) {
      console.error('Error saving drink:', error);
      alert('Error saving drink.');
    }
  };

  const onSavePackage = async (pkg) => {
    const packageRef = doc(db, 'packages', pkg.id);
    try {
      await updateDoc(packageRef, pkg); // Save the entire package object
      alert('Package saved successfully');
    } catch (error) {
      console.error('Error saving package:', error);
      alert('Error saving package.');
    }
  };

  // Handle file upload
  // ... rest of the code remains the same

  return (
    <div>
      <h1>Welcome to the Admin Management Page</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <DrinksTable
            drinks={drinks}
            onDrinkChange={handleDrinkChange}
            onSaveDrink={saveDrink}
          />

          <PackagesTable
            packages={packages}
            onPackageChange={handlePackageChange}
            onSavePackage={onSavePackage}
          />

          {/* ... other code for file upload and modals */}
        </>
      )}
    </div>
  );
}
