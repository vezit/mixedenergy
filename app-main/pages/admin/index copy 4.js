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
  doc,
  deleteDoc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/router';
import { firebaseApp } from '../../lib/firebase';
import DrinksTable from '../../components/DrinksTable';
// import PackagesTable from '../../components/PackagesTable'; // Uncomment if needed
import Modal from '../../components/Modal';

export default function AdminPage() {
  const [drinks, setDrinks] = useState([]);
  // const [packages, setPackages] = useState([]); // Uncomment if needed
  const [loading, setLoading] = useState(true);
  const [uploadedData, setUploadedData] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const router = useRouter();
  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);
  const storage = getStorage(firebaseApp);

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

    // Fetch packages if needed
    /*
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
    */
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

    // Handle image upload if the image field is a File object
    if (drink.image instanceof File) {
      try {
        const storageRef = ref(storage, `drinks_public/${docId}.png`);
        await uploadBytes(storageRef, drink.image);
        const downloadURL = await getDownloadURL(storageRef);
        drink.image = downloadURL; // Replace the File object with the download URL
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Error uploading image.');
        return;
      }
    }

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

      // Handle image upload if the image field is a File object
      if (newDrink.image instanceof File) {
        try {
          const storageRef = ref(storage, `drinks_public/${docId}.png`);
          await uploadBytes(storageRef, newDrink.image);
          const downloadURL = await getDownloadURL(storageRef);
          newDrink.image = downloadURL; // Replace the File object with the download URL
        } catch (error) {
          console.error('Error uploading image:', error);
          alert('Error uploading image.');
          return;
        }
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

  // Handle file upload for data import (optional)
  const handleFileUpload = (e) => {
    // ... (implementation)
  };

  // Handle data export (optional)
  const handleExportData = async () => {
    // ... (implementation)
  };

  // Handle logout
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

          {/* Uncomment if using PackagesTable
          <PackagesTable
            packages={packages}
            drinks={drinks}
            onPackageChange={handlePackageChange}
            onSavePackage={savePackage}
            onDeletePackage={deletePackage}
            onAddPackage={addPackage}
          /> */}

          {/* Optional: File upload and export buttons */}
          {/* <div className="mt-8">
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
          </div> */}

          {/* Confirmation Modal for data overwrite (if implementing data import) */}
          {/* {showConfirmModal && (
            <Modal
              isOpen={showConfirmModal}
              onClose={() => setShowConfirmModal(false)}
              title="Confirm Delete and Replace"
            >
              // ... (modal content)
            </Modal>
          )} */}
        </>
      )}
    </div>
  );
}
