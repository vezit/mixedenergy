// pages/admin/index.js

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { useRouter } from 'next/router';
import { firebaseApp } from '../../lib/firebase';
import DrinksTable from '../../components/DrinksTable';
import PackagesTable from '../../components/PackagesTable';
import Modal from '../../components/Modal';

export default function AdminPage() {
  const [drinks, setDrinks] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadedData, setUploadedData] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  const router = useRouter();
  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/admin/login');
      } else if (user.email !== 'admin@mixedenergy.dk') {
        router.push('/');
      } else {
        setLoading(false); // User is authenticated and is admin
      }
    });

    return () => unsubscribe();
  }, [auth, router]);

  const fetchData = async () => {
    const drinksSnapshot = await getDocs(collection(db, 'drinks'));
    setDrinks(
      drinksSnapshot.docs.map((doc) => ({
        ...doc.data(),
        docId: doc.id, // Firestore document ID
      }))
    );

    const packagesSnapshot = await getDocs(collection(db, 'packages'));
    setPackages(
      packagesSnapshot.docs.map((doc) => ({
        ...doc.data(),
        docId: doc.id,
      }))
    );
  };

  useEffect(() => {
    if (!loading) {
      fetchData();
    }
  }, [db, loading]);

  // Handle changes in drinks data
  const handleDrinkChange = (drinkDocId, path, value) => {
    const updatedDrinks = drinks.map((drink) => {
      if (drink.docId === drinkDocId) {
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
  const handlePackageChange = (pkgDocId, path, value) => {
    const updatedPackages = packages.map((pkg) => {
      if (pkg.docId === pkgDocId) {
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
    const drinkRef = doc(db, 'drinks', drink.docId);
    try {
      await updateDoc(drinkRef, drink); // Save the entire drink object
      alert('Drink saved successfully');
    } catch (error) {
      console.error('Error saving drink:', error);
      alert('Error saving drink.');
    }
  };

  const onSavePackage = async (pkg) => {
    const packageRef = doc(db, 'packages', pkg.docId);
    try {
      await updateDoc(packageRef, pkg); // Save the entire package object
      alert('Package saved successfully');
    } catch (error) {
      console.error('Error saving package:', error);
      alert('Error saving package.');
    }
  };

  // Function to add a new drink
  const addDrink = async (newDrink) => {
    try {
      // Generate the docId based on the name
      const generateDocId = (name) => {
        return name.trim().toLowerCase().replace(/\s+/g, '-');
      };
  
      const docId = generateDocId(newDrink.name);
  
      // Check if a drink with the same docId already exists
      const drinkRef = doc(db, 'drinks', docId);
      const drinkSnap = await getDoc(drinkRef);
  
      if (drinkSnap.exists()) {
        alert(`docID: ${docId} already exists`);
        return;
      }
  
      // Ensure all existing IDs are numbers
      const existingIds = drinks
        .map((drink) => Number(drink.id))
        .filter((id) => !isNaN(id));
  
      const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
      const newId = maxId + 1;
  
      // Check if 'id' already exists in the database
      const idQuery = query(collection(db, 'drinks'), where('id', '==', newId));
      const idQuerySnapshot = await getDocs(idQuery);
  
      if (!idQuerySnapshot.empty) {
        alert(`id: ${newId} already exists. Please try again.`);
        return;
      }
  
      newDrink.id = newId;
  
      // Use docId as document id
      await setDoc(drinkRef, newDrink);
  
      // Update local state
      setDrinks([...drinks, { ...newDrink, docId }]);
      alert('New drink added successfully.');
    } catch (error) {
      console.error('Error adding new drink:', error);
      alert('Error adding new drink.');
    }
  };

  // Handle file upload (unchanged)
  const handleFileUpload = (e) => {
    // ... existing code ...
  };

  // Validate data structure (unchanged)
  const validateDataStructure = (data) => {
    // ... existing code ...
  };

  const handleConfirmOverwrite = async () => {
    // ... existing code ...
  };

  const deleteDrink = async (drinkDocId) => {
    if (confirm('Are you sure you want to delete this drink?')) {
      try {
        // Delete the drink document
        await deleteDoc(doc(db, 'drinks', drinkDocId));
        // Remove the drink from the local state
        setDrinks(drinks.filter((drink) => drink.docId !== drinkDocId));

        // Also remove the drink from any packages where it appears
        const updatedPackages = packages.map((pkg) => {
          const updatedPackage = { ...pkg };
          if (updatedPackage.drinks && Array.isArray(updatedPackage.drinks)) {
            updatedPackage.drinks = updatedPackage.drinks.filter(
              (id) => id !== drinkDocId
            );
          }
          return updatedPackage;
        });
        setPackages(updatedPackages);

        // Save the updated packages to Firestore
        updatedPackages.forEach(async (pkg) => {
          const packageRef = doc(db, 'packages', pkg.docId);
          await updateDoc(packageRef, { drinks: pkg.drinks });
        });

        alert('Drink deleted successfully.');
      } catch (error) {
        console.error('Error deleting drink:', error);
        alert('Error deleting drink.');
      }
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Welcome to the Admin Management Page</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <DrinksTable
            drinks={drinks}
            onDrinkChange={handleDrinkChange}
            onSaveDrink={saveDrink}
            onDeleteDrink={deleteDrink}
            onAddDrink={addDrink} // Pass the function here
          />

          <PackagesTable
            packages={packages}
            drinks={drinks} // Pass drinks as a prop
            onPackageChange={handlePackageChange}
            onSavePackage={onSavePackage}
          />

          <div className="mt-8">
            <h2 className="text-xl font-bold mb-2">Upload Packages and Drinks JSON</h2>
            <input type="file" accept=".json" onChange={handleFileUpload} />
          </div>

          {/* Confirmation Modal */}
          {showConfirmModal && (
            <Modal
              isOpen={showConfirmModal}
              onClose={() => setShowConfirmModal(false)}
              title="Confirm Delete and Replace"
            >
              <p className="mb-4">
                Warning: You are about to delete existing packages and drinks data and replace it with the uploaded data. This action cannot be undone.
              </p>
              <p className="mb-4">
                Please type <strong>delete</strong> to confirm:
              </p>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                className="border p-2 mb-4 w-full"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleConfirmOverwrite}
                  className="bg-red-500 text-white py-2 px-4 rounded mr-2"
                >
                  Yes, Delete and Replace
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="bg-gray-300 py-2 px-4 rounded"
                >
                  Cancel
                </button>
              </div>
            </Modal>
          )}
        </>
      )}
    </div>
  );
}
