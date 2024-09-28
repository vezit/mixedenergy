// pages/admin/index.js

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
      // Validate the drink object
      if (
        !newDrink ||
        !newDrink.name ||
        !newDrink.salePrice ||
        !newDrink.purchasePrice ||
        !newDrink.packageQuantity
      ) {
        alert(
          'Please provide all necessary fields: name, salePrice, purchasePrice, and packageQuantity.'
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
      const drinkRef = doc(db, 'drinks', docId);
      const drinkSnap = await getDoc(drinkRef);

      if (drinkSnap.exists()) {
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
      const idQuery = query(collection(db, 'drinks'), where('id', '==', newId));
      const idQuerySnapshot = await getDocs(idQuery);

      if (!idQuerySnapshot.empty) {
        alert(`id: ${newId} already exists. Please try again.`);
        return;
      }

      // Assign new id to the drink
      newDrink.id = newId;

      // Add the new drink to Firestore using docId
      await setDoc(drinkRef, newDrink);

      // Update local state to include the new drink
      setDrinks([...drinks, { ...newDrink, docId }]);
      alert('New drink added successfully.');
    } catch (error) {
      console.error('Error adding new drink:', error);
      alert('Error adding new drink. See console for details.');
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
      const packageRef = doc(db, 'packages', docId);
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

    if (!data.drinks || typeof data.drinks !== 'object') {
      return 'Data must contain a "drinks" object.';
    }

    if (!data.packages || typeof data.packages !== 'object') {
      return 'Data must contain a "packages" object.';
    }

    // Extract drink IDs from the drinks object
    const drinkDocIds = Object.keys(data.drinks);

    // Check for duplicate docIDs in drinks
    const duplicateDrinkDocIds = drinkDocIds.filter(
      (id, index) => drinkDocIds.indexOf(id) !== index
    );
    if (duplicateDrinkDocIds.length > 0) {
      return `Duplicate docIDs found in drinks: ${duplicateDrinkDocIds.join(', ')}`;
    }

    // Validate docIDs format in drinks
    for (const docId of drinkDocIds) {
      // Check that docId is in correct format
      const docIdPattern = /^[a-z0-9-]+$/;
      if (!docIdPattern.test(docId)) {
        return `Invalid docID format in drinks: "${docId}". Expected lowercase letters, numbers, and hyphens only.`;
      }
    }

    // Check for duplicate 'id' in drinks
    const drinkIds = Object.values(data.drinks).map((drink) => drink.id);
    const duplicateDrinkIds = drinkIds.filter(
      (id, index) => drinkIds.indexOf(id) !== index
    );
    if (duplicateDrinkIds.length > 0) {
      // Find which drinks have the duplicate ids
      const duplicateDrinksInfo = Object.entries(data.drinks)
        .filter(([docId, drink]) => duplicateDrinkIds.includes(drink.id))
        .map(([docId, drink]) => `${drink.name} (id: ${drink.id})`);
      return `Duplicate "id" values found in drinks: ${duplicateDrinksInfo.join(', ')}`;
    }

    // Validate 'id' in drinks are unique and numbers
    for (const [docId, drink] of Object.entries(data.drinks)) {
      if (typeof drink.id !== 'number') {
        return `Invalid "id" value in drinks. Expected number for "${drink.name}", got ${typeof drink.id}.`;
      }
    }

    // Similar validation for packages
    const packageDocIds = Object.keys(data.packages);
    const duplicatePackageDocIds = packageDocIds.filter(
      (id, index) => packageDocIds.indexOf(id) !== index
    );
    if (duplicatePackageDocIds.length > 0) {
      return `Duplicate docIDs found in packages: ${duplicatePackageDocIds.join(', ')}`;
    }

    // Validate docIDs format in packages
    for (const docId of packageDocIds) {
      const docIdPattern = /^[a-z0-9-]+$/;
      if (!docIdPattern.test(docId)) {
        return `Invalid docID format in packages: "${docId}". Expected lowercase letters, numbers, and hyphens only.`;
      }
    }

    // **New Validation: Ensure all drink IDs in packages exist in the drinks object**
    for (const [pkgDocId, pkgData] of Object.entries(data.packages)) {
      if (pkgData.drinks && Array.isArray(pkgData.drinks)) {
        for (const drinkId of pkgData.drinks) {
          if (!drinkDocIds.includes(drinkId)) {
            return `Package "${pkgDocId}" references a drink "${drinkId}" that does not exist in the drinks object.`;
          }
        }
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
      // Delete existing drinks
      const drinksSnapshot = await getDocs(collection(db, 'drinks'));
      const drinksDeletionPromises = drinksSnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(drinksDeletionPromises);

      // Delete existing packages
      const packagesSnapshot = await getDocs(collection(db, 'packages'));
      const packagesDeletionPromises = packagesSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(packagesDeletionPromises);

      // Now, add new drinks
      const drinksData = uploadedData.drinks;
      for (const [docId, drinkData] of Object.entries(drinksData)) {
        const drinkRef = doc(db, 'drinks', docId);
        await setDoc(drinkRef, drinkData);
      }

      // Add new packages
      const packagesData = uploadedData.packages;
      for (const [docId, packageData] of Object.entries(packagesData)) {
        const packageRef = doc(db, 'packages', docId);
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

  // Function to delete a package
  const deletePackage = async (packageDocId) => {
    if (confirm('Are you sure you want to delete this package?')) {
      try {
        // Delete the package document
        await deleteDoc(doc(db, 'packages', packageDocId));
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
      const drinksSnapshot = await getDocs(collection(db, 'drinks'));
      const packagesSnapshot = await getDocs(collection(db, 'packages'));

      const drinksData = {};
      drinksSnapshot.forEach((doc) => {
        drinksData[doc.id] = doc.data();
      });

      const packagesData = {};
      packagesSnapshot.forEach((doc) => {
        packagesData[doc.id] = doc.data();
      });

      const dataToExport = {
        drinks: drinksData,
        packages: packagesData,
      };

      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'database_export.json';
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data.');
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
