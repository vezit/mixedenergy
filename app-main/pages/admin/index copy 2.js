// /pages/admin/index.js

import { useState, useEffect } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
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
// import DrinksTable from '../../components/DrinksTable';
// import PackagesTable from '../../components/PackagesTable';
import Modal from '../../components/Modal';

export default function AdminPage() {
  const [drinks, setDrinks] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadedData, setUploadedData] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [userEmail, setUserEmail] = useState('');

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
        setUserEmail(user.email);
        setLoading(false); // User is authenticated and is admin
      }
    });

    return () => unsubscribe();
  }, [auth, router]);

  const fetchData = async () => {
    // Fetch drinks_public collection
    const drinksPublicSnapshot = await getDocs(collection(db, 'drinks_public'));
    const drinksPublic = drinksPublicSnapshot.docs.map((doc) => ({
      ...doc.data(),
      docId: doc.id,
    }));

    // Fetch drinks_private collection
    const drinksPrivateSnapshot = await getDocs(collection(db, 'drinks_private'));
    const drinksPrivate = drinksPrivateSnapshot.docs.map((doc) => ({
      ...doc.data(),
      docId: doc.id,
    }));

    // Merge public and private data
    const drinksMap = {};
    drinksPublic.forEach((drink) => {
      drinksMap[drink.docId] = { ...drink };
    });

    drinksPrivate.forEach((drink) => {
      if (drinksMap[drink.docId]) {
        // Merge private fields into the drink object, prefixing private fields with '_'
        Object.keys(drink).forEach((key) => {
          if (key !== 'docId') {
            drinksMap[drink.docId][`_${key}`] = drink[key];
          }
        });
      } else {
        // Private data without public data
        drinksMap[drink.docId] = { docId: drink.docId };
        Object.keys(drink).forEach((key) => {
          if (key !== 'docId') {
            drinksMap[drink.docId][`_${key}`] = drink[key];
          }
        });
      }
    });

    const mergedDrinks = Object.values(drinksMap);
    setDrinks(mergedDrinks);

    // Fetch packages_public collection
    const packagesPublicSnapshot = await getDocs(collection(db, 'packages_public'));
    const packagesPublic = packagesPublicSnapshot.docs.map((doc) => ({
      ...doc.data(),
      docId: doc.id,
    }));

    // Fetch packages_private collection
    const packagesPrivateSnapshot = await getDocs(collection(db, 'packages_private'));
    const packagesPrivate = packagesPrivateSnapshot.docs.map((doc) => ({
      ...doc.data(),
      docId: doc.id,
    }));

    // Merge public and private data for packages
    const packagesMap = {};
    packagesPublic.forEach((pkg) => {
      packagesMap[pkg.docId] = { ...pkg };
    });

    packagesPrivate.forEach((pkg) => {
      if (packagesMap[pkg.docId]) {
        // Merge private fields into the package object, prefixing private fields with '_'
        Object.keys(pkg).forEach((key) => {
          if (key !== 'docId') {
            packagesMap[pkg.docId][`_${key}`] = pkg[key];
          }
        });
      } else {
        // Private data without public data
        packagesMap[pkg.docId] = { docId: pkg.docId };
        Object.keys(pkg).forEach((key) => {
          if (key !== 'docId') {
            packagesMap[pkg.docId][`_${key}`] = pkg[key];
          }
        });
      }
    });

    const mergedPackages = Object.values(packagesMap);
    setPackages(mergedPackages);
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
    const { docId } = drink;

    // Separate public and private fields
    const publicFields = {};
    const privateFields = {};

    Object.keys(drink).forEach((key) => {
      if (key === 'docId') return;
      if (key.startsWith('_')) {
        // Private field
        privateFields[key.substring(1)] = drink[key];
      } else {
        publicFields[key] = drink[key];
      }
    });

    const drinkPublicRef = doc(db, 'drinks_public', docId);
    const drinkPrivateRef = doc(db, 'drinks_private', docId);

    try {
      await setDoc(drinkPublicRef, publicFields);
      await setDoc(drinkPrivateRef, privateFields);
      alert('Drink saved successfully');
    } catch (error) {
      console.error('Error saving drink:', error);
      alert('Error saving drink.');
    }
  };

  const deleteDrink = async (drinkDocId) => {
    if (confirm('Are you sure you want to delete this drink?')) {
      try {
        // Delete the drink document from both collections
        await deleteDoc(doc(db, 'drinks_public', drinkDocId));
        await deleteDoc(doc(db, 'drinks_private', drinkDocId));

        // Remove the drink from the local state
        setDrinks(drinks.filter((drink) => drink.docId !== drinkDocId));

        // Also remove the drink from any packages where it appears
        const updatedPackages = packages.map((pkg) => {
          const updatedPackage = { ...pkg };
          if (
            updatedPackage.collection_drinks_public &&
            Array.isArray(updatedPackage.collection_drinks_public)
          ) {
            updatedPackage.collection_drinks_public = updatedPackage.collection_drinks_public.filter(
              (id) => id !== drinkDocId
            );
          }
          return updatedPackage;
        });
        setPackages(updatedPackages);

        // Save the updated packages to Firestore
        updatedPackages.forEach(async (pkg) => {
          const packagePublicRef = doc(db, 'packages_public', pkg.docId);
          const packagePrivateRef = doc(db, 'packages_private', pkg.docId);

          // Separate public and private fields
          const publicFields = {};
          const privateFields = {};

          Object.keys(pkg).forEach((key) => {
            if (key === 'docId') return;
            if (key.startsWith('_')) {
              // Private field
              privateFields[key.substring(1)] = pkg[key];
            } else {
              publicFields[key] = pkg[key];
            }
          });

          await setDoc(packagePublicRef, publicFields);
          await setDoc(packagePrivateRef, privateFields);
        });

        alert('Drink deleted successfully.');
      } catch (error) {
        console.error('Error deleting drink:', error);
        alert('Error deleting drink.');
      }
    }
  };

  // Function to add a new drink
  const addDrink = async (newDrink) => {
    try {
      // Validate the drink object
      if (!newDrink || !newDrink.name || !newDrink._purchasePrice) {
        alert('Please provide all necessary fields: name and _purchasePrice.');
        return;
      }

      // Generate the docId based on the name
      const generateDocId = (name) => {
        return name
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
      };

      const docId = generateDocId(newDrink.name);

      if (!docId) {
        alert('Invalid name for the new drink. Could not generate a valid docId.');
        return;
      }

      // Check if a drink with the same docId already exists
      const drinkPublicRef = doc(db, 'drinks_public', docId);
      const drinkPrivateRef = doc(db, 'drinks_private', docId);
      const drinkPublicSnap = await getDoc(drinkPublicRef);
      const drinkPrivateSnap = await getDoc(drinkPrivateRef);

      if (drinkPublicSnap.exists() || drinkPrivateSnap.exists()) {
        alert(`docID: ${docId} already exists. Please choose a different name.`);
        return;
      }

      // Split the drink data into public and private fields
      const publicData = {};
      const privateData = {};
      Object.keys(newDrink).forEach((key) => {
        if (key.startsWith('_')) {
          privateData[key.substring(1)] = newDrink[key];
        } else {
          publicData[key] = newDrink[key];
        }
      });

      // Add the new drink to Firestore using docId
      await setDoc(drinkPublicRef, publicData);
      await setDoc(drinkPrivateRef, privateData);

      // Update local state to include the new drink
      setDrinks([...drinks, { ...newDrink, docId }]);
      alert('New drink added successfully.');
    } catch (error) {
      console.error('Error adding new drink:', error);
      alert('Error adding new drink. See console for details.');
    }
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

  const savePackage = async (pkg) => {
    const { docId } = pkg;

    // Separate public and private fields
    const publicFields = {};
    const privateFields = {};

    Object.keys(pkg).forEach((key) => {
      if (key === 'docId') return;
      if (key.startsWith('_')) {
        // Private field
        privateFields[key.substring(1)] = pkg[key];
      } else {
        publicFields[key] = pkg[key];
      }
    });

    const packagePublicRef = doc(db, 'packages_public', docId);
    const packagePrivateRef = doc(db, 'packages_private', docId);

    try {
      await setDoc(packagePublicRef, publicFields);
      await setDoc(packagePrivateRef, privateFields);
      alert('Package saved successfully');
    } catch (error) {
      console.error('Error saving package:', error);
      alert('Error saving package.');
    }
  };

  // Function to add a new package
  const addPackage = async (newPackage) => {
    try {
      // Validate the package object
      if (!newPackage || !newPackage.title || !newPackage.slug) {
        alert('Please provide all necessary fields: title and slug.');
        return;
      }

      // Generate the docId based on the slug
      const docId = newPackage.slug;

      // Check if a package with the same docId already exists
      const packagePublicRef = doc(db, 'packages_public', docId);
      const packagePrivateRef = doc(db, 'packages_private', docId);
      const packagePublicSnap = await getDoc(packagePublicRef);
      const packagePrivateSnap = await getDoc(packagePrivateRef);

      if (packagePublicSnap.exists() || packagePrivateSnap.exists()) {
        alert(`docID: ${docId} already exists. Please choose a different slug.`);
        return;
      }

      // Split the package data into public and private fields
      const publicData = {};
      const privateData = {};
      Object.keys(newPackage).forEach((key) => {
        if (key.startsWith('_')) {
          privateData[key.substring(1)] = newPackage[key];
        } else {
          publicData[key] = newPackage[key];
        }
      });

      // Add the new package to Firestore using docId
      await setDoc(packagePublicRef, publicData);
      await setDoc(packagePrivateRef, privateData);

      // Update local state to include the new package
      setPackages([...packages, { ...newPackage, docId }]);
      alert('New package added successfully.');
    } catch (error) {
      console.error('Error adding new package:', error);
      alert('Error adding new package. See console for details.');
    }
  };

  const deletePackage = async (packageDocId) => {
    if (confirm('Are you sure you want to delete this package?')) {
      try {
        // Delete the package document from both collections
        await deleteDoc(doc(db, 'packages_public', packageDocId));
        await deleteDoc(doc(db, 'packages_private', packageDocId));

        // Remove the package from the local state
        setPackages(packages.filter((pkg) => pkg.docId !== packageDocId));

        alert('Package deleted successfully.');
      } catch (error) {
        console.error('Error deleting package:', error);
        alert('Error deleting package.');
      }
    }
  };

  // Function to export data
  const handleExportData = async () => {
    try {
      // Fetch the latest data
      const collectionsToExport = [
        'drinks_public',
        'drinks_private',
        'packages_public',
        'packages_private',
      ];

      const dataToExport = {};

      for (const collectionName of collectionsToExport) {
        const collectionSnapshot = await getDocs(collection(db, collectionName));
        const collectionData = {};
        collectionSnapshot.forEach((doc) => {
          collectionData[doc.id] = doc.data();
        });
        dataToExport[collectionName] = collectionData;
      }

      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'firebase_collections_structure.json';
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data.');
    }
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) {
      alert('No file selected');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        // Validate the data structure
        const validationError = validateDataStructure(data);
        if (validationError) {
          alert(validationError);
          return;
        }

        setUploadedData(data);
        setShowConfirmModal(true);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        alert('Invalid JSON file.');
      }
    };

    reader.readAsText(file);
  };

  // Validate data structure
  const validateDataStructure = (data) => {
    if (!data || typeof data !== 'object') {
      return 'Invalid data format. Expected an object.';
    }

    // Validate that for each *_public collection, there is a *_private collection, and vice versa
    const collectionNames = Object.keys(data);
    const publicCollections = collectionNames.filter((name) =>
      name.endsWith('_public')
    );
    const privateCollections = collectionNames.filter((name) =>
      name.endsWith('_private')
    );

    for (const pubCol of publicCollections) {
      const counterpart = pubCol.replace('_public', '_private');
      if (!collectionNames.includes(counterpart)) {
        return `Missing counterpart collection for "${pubCol}". Expected "${counterpart}".`;
      }
    }

    for (const privCol of privateCollections) {
      const counterpart = privCol.replace('_private', '_public');
      if (!collectionNames.includes(counterpart)) {
        return `Missing counterpart collection for "${privCol}". Expected "${counterpart}".`;
      }
    }

    return null; // No error
  };

  const handleConfirmOverwrite = async () => {
    if (deleteInput !== 'delete') {
      alert('Please type "delete" to confirm.');
      return;
    }

    setShowConfirmModal(false);

    try {
      // Delete existing collections
      const collectionsToDelete = [
        'drinks_public',
        'drinks_private',
        'packages_public',
        'packages_private',
      ];

      for (const collectionName of collectionsToDelete) {
        const collectionSnapshot = await getDocs(collection(db, collectionName));
        const deletionPromises = collectionSnapshot.docs.map((doc) =>
          deleteDoc(doc.ref)
        );
        await Promise.all(deletionPromises);
      }

      // Now, add new data
      for (const [collectionName, collectionData] of Object.entries(uploadedData)) {
        for (const [docId, docData] of Object.entries(collectionData)) {
          const docRef = doc(db, collectionName, docId);
          await setDoc(docRef, docData);
        }
      }

      alert('Data replaced successfully.');
      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error replacing data:', error);
      alert('Error replacing data.');
    } finally {
      setDeleteInput('');
    }
  };

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        router.push('/admin/login');
      })
      .catch((error) => {
        console.error('Error during logout:', error);
        alert('Error during logout.');
      });
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Welcome to the Admin Management Page</h1>
        <div>
          <span className="mr-4">Logged in as: {userEmail}</span>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* <DrinksTable
            drinks={drinks}
            onDrinkChange={handleDrinkChange}
            onSaveDrink={saveDrink}
            onDeleteDrink={deleteDrink}
            onAddDrink={addDrink}
          />

          <PackagesTable
            packages={packages}
            drinks={drinks}
            onPackageChange={handlePackageChange}
            onSavePackage={savePackage}
            onDeletePackage={deletePackage}
            onAddPackage={addPackage}
          /> */}

          <div className="mt-8">
            <h2 className="text-xl font-bold mb-2">Upload Data JSON</h2>
            <input type="file" accept=".json" onChange={handleFileUpload} />
          </div>

          <div className="mt-4">
            <button
              onClick={handleExportData}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Export Data
            </button>
          </div>

          {/* Confirmation Modal */}
          {showConfirmModal && (
            <Modal
              isOpen={showConfirmModal}
              onClose={() => setShowConfirmModal(false)}
              title="Confirm Delete and Replace"
            >
              <p className="mb-4">
                Warning: You are about to delete existing data and replace it with the uploaded data. This action cannot be undone.
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
