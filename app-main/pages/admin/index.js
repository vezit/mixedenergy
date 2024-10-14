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
  query,
  where,
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
    const packagesSnapshot = await getDocs(collection(db, 'packages_public'));
    const packagesData = packagesSnapshot.docs.map((doc) => ({
      ...doc.data(),
      docId: doc.id,
    }));
    setPackages(packagesData);
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
      await updateDoc(drinkPublicRef, publicFields);
      await updateDoc(drinkPrivateRef, privateFields);
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
          const packageRef = doc(db, 'packages_public', pkg.docId);
          await updateDoc(packageRef, { drinks: pkg.drinks });
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
      if (
        !newDrink ||
        !newDrink.name ||
        !newDrink.salePrice ||
        !newDrink._purchasePrice ||
        !newDrink._packageQuantity
      ) {
        alert(
          'Please provide all necessary fields: name, salePrice, _purchasePrice, and _packageQuantity.'
        );
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

      // Ensure all existing IDs are numbers
      const existingIds = drinks
        .map((drink) => Number(drink.id))
        .filter((id) => !isNaN(id));

      const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
      const newId = maxId + 1;

      // Check if 'id' already exists in the database
      const idQuery = query(collection(db, 'drinks_public'), where('id', '==', newId));
      const idQuerySnapshot = await getDocs(idQuery);

      if (!idQuerySnapshot.empty) {
        alert(`id: ${newId} already exists. Please try again.`);
        return;
      }

      // Assign new id to the drink
      newDrink.id = newId;

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

  const onSavePackage = async (pkg) => {
    const packageRef = doc(db, 'packages_public', pkg.docId);
    try {
      await updateDoc(packageRef, pkg); // Save the entire package object
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
      if (!newPackage || !newPackage.title || !newPackage.slug || !newPackage.packages) {
        alert('Please provide all necessary fields: title, slug, and packages.');
        return;
      }

      // Generate the docId based on the slug
      const docId = newPackage.slug;

      // Check if a package with the same docId already exists
      const packageRef = doc(db, 'packages_public', docId);
      const packageSnap = await getDoc(packageRef);

      if (packageSnap.exists()) {
        alert(`docID: ${docId} already exists. Please choose a different slug.`);
        return;
      }

      // Add the new package to Firestore using docId
      await setDoc(packageRef, newPackage);

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
        // Delete the package document
        await deleteDoc(doc(db, 'packages_public', packageDocId));
        // Remove the package from the local state
        setPackages(packages.filter((pkg) => pkg.docId !== packageDocId));
        alert('Package deleted successfully.');
      } catch (error) {
        console.error('Error deleting package:', error);
        alert('Error deleting package.');
      }
    }
  };


  // Inside your AdminPage component
  const handleExportOrders = async () => {
    try {
      // Fetch orders collection
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const ordersData = {};
      ordersSnapshot.forEach((doc) => {
        ordersData[doc.id] = doc.data();
      });

      const jsonString = JSON.stringify(ordersData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'orders.json';
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting orders:', error);
      alert('Error exporting orders.');
    }
  };


  // Function to export data
  const handleExportDrinksAndPackages = async () => {
    try {
      // Fetch the latest data
      const drinksPublicSnapshot = await getDocs(collection(db, 'drinks_public'));
      const drinksPrivateSnapshot = await getDocs(collection(db, 'drinks_private'));
      const packagesSnapshot = await getDocs(collection(db, 'packages_public'));

      // Create drinks_public and drinks_private objects
      const drinksPublic = {};
      drinksPublicSnapshot.forEach((doc) => {
        drinksPublic[doc.id] = doc.data();
      });

      const drinksPrivate = {};
      drinksPrivateSnapshot.forEach((doc) => {
        const privateData = {};
        Object.keys(doc.data()).forEach((key) => {
          privateData[`_${key}`] = doc.data()[key];
        });
        drinksPrivate[doc.id] = privateData;
      });

      // Create packages_public object
      const packagesPublic = {};
      packagesSnapshot.forEach((doc) => {
        packagesPublic[doc.id] = doc.data();
      });

      const dataToExport = {
        drinks_private: drinksPrivate,
        drinks_public: drinksPublic,
        packages_public: packagesPublic,
      };

      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'privat_public_drinks_and_collections.json';
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

    if (!data.drinks_public || typeof data.drinks_public !== 'object') {
      return 'Data must contain a "drinks_public" object.';
    }

    if (!data.drinks_private || typeof data.drinks_private !== 'object') {
      return 'Data must contain a "drinks_private" object.';
    }

    if (!data.packages_public || typeof data.packages_public !== 'object') {
      return 'Data must contain a "packages_public" object.';
    }

    // Validate that drinks_public and drinks_private have matching keys
    const publicDrinkKeys = Object.keys(data.drinks_public);
    const privateDrinkKeys = Object.keys(data.drinks_private);

    const allDrinkKeys = new Set([...publicDrinkKeys, ...privateDrinkKeys]);

    // Validate docIDs format in drinks
    for (const docId of allDrinkKeys) {
      // Check that docId is in correct format
      const docIdPattern = /^[a-z0-9-]+$/;
      if (!docIdPattern.test(docId)) {
        return `Invalid docID format in drinks: "${docId}". Expected lowercase letters, numbers, and hyphens only.`;
      }
    }

    // Similar validation for packages_public
    const packageDocIds = Object.keys(data.packages_public);

    for (const docId of packageDocIds) {
      const docIdPattern = /^[a-z0-9-]+$/;
      if (!docIdPattern.test(docId)) {
        return `Invalid docID format in packages: "${docId}". Expected lowercase letters, numbers, and hyphens only.`;
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
      // Delete existing drinks in both collections
      const drinksPublicSnapshot = await getDocs(collection(db, 'drinks_public'));
      const drinksPublicDeletionPromises = drinksPublicSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(drinksPublicDeletionPromises);

      const drinksPrivateSnapshot = await getDocs(collection(db, 'drinks_private'));
      const drinksPrivateDeletionPromises = drinksPrivateSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(drinksPrivateDeletionPromises);

      // Delete existing packages
      const packagesSnapshot = await getDocs(collection(db, 'packages_public'));
      const packagesDeletionPromises = packagesSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(packagesDeletionPromises);

      // Now, add new drinks
      const drinksPublicData = uploadedData.drinks_public;
      const drinksPrivateData = uploadedData.drinks_private;

      for (const docId of new Set([...Object.keys(drinksPublicData), ...Object.keys(drinksPrivateData)])) {
        const publicData = drinksPublicData[docId] || {};
        const privateData = {};

        const privateDataRaw = drinksPrivateData[docId] || {};
        // Remove underscores from private field keys
        Object.keys(privateDataRaw).forEach((key) => {
          if (key.startsWith('_')) {
            privateData[key.substring(1)] = privateDataRaw[key];
          } else {
            privateData[key] = privateDataRaw[key];
          }
        });

        // Save public data to drinks_public collection
        const drinkPublicRef = doc(db, 'drinks_public', docId);
        await setDoc(drinkPublicRef, publicData);

        // Save private data to drinks_private collection
        const drinkPrivateRef = doc(db, 'drinks_private', docId);
        await setDoc(drinkPrivateRef, privateData);
      }

      // Add new packages
      const packagesData = uploadedData.packages_public;
      for (const [docId, packageData] of Object.entries(packagesData)) {
        const packageRef = doc(db, 'packages_public', docId);
        await setDoc(packageRef, packageData);
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
          <DrinksTable
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
            onSavePackage={onSavePackage}
            onDeletePackage={deletePackage}
            onAddPackage={addPackage}
          />

          <div className="mt-8">
            <h2 className="text-xl font-bold mb-2">Upload Packages and Drinks JSON</h2>
            <input type="file" accept=".json" onChange={handleFileUpload} />
          </div>

          <div className="mt-4">
            <button
              onClick={handleExportDrinksAndPackages}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Export drinks and packages
            </button>
          </div>
          <div className="mt-4">
          <button
            onClick={handleExportOrders}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Export Orders
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
                Warning: You are about to delete existing packages and drinks data and
                replace it with the uploaded data. This action cannot be undone.
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
