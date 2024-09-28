// pages/admin/index.js

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, getDocs, updateDoc, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/router';
import { firebaseApp } from '../../lib/firebase'; // Ensure this is correctly imported
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
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileContent = event.target.result;
        try {
          const data = JSON.parse(fileContent);
          // Validate data
          const isValid = validateDataStructure(data);
          if (isValid) {
            setUploadedData(data);
            setShowConfirmModal(true);
          } else {
            alert('Invalid data structure.');
          }
        } catch (error) {
          alert('Failed to parse JSON file.');
        }
      };
      reader.readAsText(file);
    }
  };

  // Validate the structure of the uploaded data
  const validateDataStructure = (data) => {
    // Define the expected structure based on the provided packages_and_drinks.json
    if (!data || typeof data !== 'object') return false;
    if (!data.packages || !data.drinks) return false;

    // Further validation can be added here to check for specific fields
    const expectedPackageFields = ['slug', 'category', 'title', 'description', 'image', 'packages', 'drinks'];
    const expectedDrinkFields = ['image', 'stock', 'id', 'name', 'size', 'isSugarFree', 'salePrice', 'purchasePrice', 'packageQuantity', 'nutrition'];

    // Validate packages
    for (const pkgKey in data.packages) {
      const pkg = data.packages[pkgKey];
      for (const field of expectedPackageFields) {
        if (!(field in pkg)) {
          console.error(`Package ${pkgKey} is missing field: ${field}`);
          return false;
        }
      }
    }

    // Validate drinks
    for (const drinkKey in data.drinks) {
      const drink = data.drinks[drinkKey];
      for (const field of expectedDrinkFields) {
        if (!(field in drink)) {
          console.error(`Drink ${drinkKey} is missing field: ${field}`);
          return false;
        }
      }
    }

    return true;
  };

  const handleConfirmOverwrite = async () => {
    if (deleteInput !== 'delete') {
      alert('You must type "delete" to confirm.');
      return;
    }

    setShowConfirmModal(false);
    setDeleteInput('');

    try {
      // Get the ID token of the current user
      const idToken = await auth.currentUser.getIdToken(true);

      const response = await fetch('/api/admin/replaceData', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken,
          data: uploadedData,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Data updated successfully.');
        // Refresh data
        fetchData();
      } else {
        console.error('Error:', result.error);
        console.error('Error Message:', result.message);
        alert(`Failed to update data: ${result.message}`);
      }
    } catch (error) {
      console.error('Failed to update data:', error);
      alert(`Failed to update data: ${error.message}`);
    }
  };


  // Function to delete a collection
  const deleteCollection = async (collectionName) => {
    const collectionRef = collection(db, collectionName);
    const querySnapshot = await getDocs(collectionRef);
    const batchSize = querySnapshot.size;

    if (batchSize === 0) {
      return;
    }

    const batch = db.batch();
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
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
          />

          <PackagesTable
            packages={packages}
            onPackageChange={handlePackageChange}
            onSavePackage={onSavePackage}
          />

          <div className="mt-8">
            <h2 className="text-xl font-bold mb-2">Upload Packages and Drinks JSON</h2>
            <input type="file" accept=".json" onChange={handleFileUpload} />
          </div>

          {/* Confirmation Modal */}
          {showConfirmModal && (
            <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Confirm Delete and Replace">
              <p className="mb-4">Warning: You are about to delete existing packages and drinks data and replace it with the uploaded data. This action cannot be undone.</p>
              <p className="mb-4">Please type <strong>delete</strong> to confirm:</p>
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
