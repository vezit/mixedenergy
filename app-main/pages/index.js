// app-main/pages/admin/index.js

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { useRouter } from 'next/router';
import firebaseApp from '../../lib/firebase';
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
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, router]);

  const fetchData = async () => {
    const drinksSnapshot = await getDocs(collection(db, 'drinks'));
    setDrinks(drinksSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));

    const packagesSnapshot = await getDocs(collection(db, 'packages'));
    setPackages(
      packagesSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }))
    );
  };

  useEffect(() => {
    if (!loading) {
      fetchData();
    }
  }, [db, loading]);

  // Handle changes in drinks data
  const handleDrinkChange = (index, field, value) => {
    const updatedDrinks = [...drinks];
    updatedDrinks[index][field] = value;
    setDrinks(updatedDrinks);
  };

  // Save individual drink
  const onSaveDrink = async (drink) => {
    const { id, ...drinkData } = drink;
    const drinkRef = doc(db, 'drinks', id);
    try {
      await updateDoc(drinkRef, drinkData);
      alert('Drink saved successfully');
    } catch (error) {
      console.error('Error saving drink:', error);
      alert('Error saving drink.');
    }
  };

  // Handle changes in packages data
  const handlePackageChange = (index, field, value) => {
    const updatedPackages = [...packages];
    updatedPackages[index][field] = value;
    setPackages(updatedPackages);
  };

  // Save individual package
  const onSavePackage = async (pkg) => {
    const { id, ...packageData } = pkg;
    const packageRef = doc(db, 'packages', id);
    try {
      await updateDoc(packageRef, packageData);
      alert('Package saved successfully');
    } catch (error) {
      console.error('Error saving package:', error);
      alert('Error saving package.');
    }
  };

  // ... [Rest of your code for file upload and modal]

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Welcome to the Admin Management Page</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <DrinksTable
            drinks={drinks}
            onDrinkChange={handleDrinkChange}
            onSaveDrink={onSaveDrink}
          />
          {/* Optional overall save button */}
          <button
            className="bg-green-500 text-white px-4 py-2 rounded mb-8"
            onClick={async () => {
              for (const drink of drinks) {
                await onSaveDrink(drink);
              }
            }}
          >
            Save All Drinks
          </button>

          <PackagesTable
            packages={packages}
            drinks={drinks}
            onPackageChange={handlePackageChange}
            onSavePackage={onSavePackage}
          />
          {/* Optional overall save button */}
          <button
            className="bg-green-500 text-white px-4 py-2 rounded mb-8"
            onClick={async () => {
              for (const pkg of packages) {
                await onSavePackage(pkg);
              }
            }}
          >
            Save All Packages
          </button>

          {/* File Upload and Modal */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Upload Drinks or Packages JSON</h2>
            <input type="file" accept=".json" onChange={handleFileUpload} />
          </div>

          {showModal && (
            <Modal onClose={() => setShowModal(false)}>
              <p>Warning: you're about to overwrite existing data. Proceed?</p>
              <button onClick={handleConfirmOverwrite}>Yes</button>
              <button onClick={() => setShowModal(false)}>No</button>
            </Modal>
          )}
        </>
      )}
    </div>
  );
}
