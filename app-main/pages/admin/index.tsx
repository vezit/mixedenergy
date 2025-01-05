// /pages/admin/index.tsx
import { useState, useEffect } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  User,
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
import PackagesTable from '../../components/PackagesTable';
import Loading from '../../components/Loading'; // Make sure this path is correct in your project
import {JSX} from 'react';

// Minimal types for Drink & Package based on the code snippet.
// Adjust fields to match your Firestore document structure
interface Drink {
  docId?: string;
  name?: string;
  image?: string | File;
  _purchasePrice?: number;
  [key: string]: any;
}

interface Package {
  docId?: string;
  slug?: string;
  title?: string;
  image?: string | File;
  [key: string]: any;
}

export default function AdminPage(): JSX.Element {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string>('');

  const router = useRouter();
  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);
  const storage = getStorage(firebaseApp);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (!user) {
        router.push('/admin/login');
      } else if (user.email !== 'admin@mixedenergy.dk') {
        router.push('/');
      } else {
        setUserEmail(user.email ?? '');
        setLoading(false); // User is authenticated and is admin
        fetchData();
      }
    });
    return () => unsubscribe();
  }, [auth, router]);

  const fetchData = async (): Promise<void> => {
    try {
      // Fetch drinks collection
      const drinksSnapshot = await getDocs(collection(db, 'drinks'));
      const drinksData: Drink[] = drinksSnapshot.docs.map((document) => ({
        ...document.data(),
        docId: document.id,
      }));
      setDrinks(drinksData);

      // Fetch packages collection
      const packagesSnapshot = await getDocs(collection(db, 'packages'));
      const packagesData: Package[] = packagesSnapshot.docs.map((document) => ({
        ...document.data(),
        docId: document.id,
      }));
      setPackages(packagesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Recursive function to update nested data
  const updateNestedData = (obj: any, pathArray: string[], value: any): void => {
    if (pathArray.length === 1) {
      obj[pathArray[0]] = value;
    } else {
      const key = pathArray[0];
      if (!obj[key]) obj[key] = {};
      updateNestedData(obj[key], pathArray.slice(1), value);
    }
  };

  // Handle changes in drinks data
  const handleDrinkChange = (drinkDocId: string, path: string[], value: any): void => {
    const updatedDrinks = drinks.map((drink) => {
      if (drink.docId === drinkDocId) {
        const updatedDrink = { ...drink };
        updateNestedData(updatedDrink, path, value);
        return updatedDrink;
      }
      return drink;
    });
    setDrinks(updatedDrinks);
  };

  const saveDrink = async (drink: Drink): Promise<void> => {
    const { docId } = drink;
    if (!docId) return;

    // Handle image upload if the image field is a File object
    if (drink.image instanceof File) {
      try {
        const storageRef = ref(storage, `public/images/drinks/${docId}.png`);
        await uploadBytes(storageRef, drink.image);

        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);
        drink.image = downloadURL; // Replace the File with the download URL
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Error uploading image.');
        return;
      }
    }

    // Remove 'docId' from the drink object before saving to Firestore
    const { docId: _, ...drinkData } = drink;

    try {
      const drinkRef = doc(db, 'drinks', docId);
      await setDoc(drinkRef, drinkData);
    } catch (error) {
      console.error('Error saving drink:', error);
      alert('Error saving drink.');
    }
  };

  const deleteDrink = async (drinkDocId: string): Promise<void> => {
    if (confirm('Are you sure you want to delete this drink?')) {
      try {
        await deleteDoc(doc(db, 'drinks', drinkDocId));
        setDrinks(drinks.filter((drink) => drink.docId !== drinkDocId));
        alert('Drink deleted successfully.');
      } catch (error) {
        console.error('Error deleting drink:', error);
        alert('Error deleting drink.');
      }
    }
  };

  // Function to add a new drink
  const addDrink = async (newDrink: Drink): Promise<void> => {
    try {
      // Validate the drink object
      if (!newDrink || !newDrink.name || !newDrink._purchasePrice) {
        alert('Please provide all necessary fields: name and _purchasePrice.');
        return;
      }

      // Generate the docId based on the name
      const generateDocId = (name: string) =>
        name
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');

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

      // Handle image upload if the image field is a File object
      if (newDrink.image instanceof File) {
        try {
          const storageRef = ref(storage, `public/images/drinks/${docId}.png`);
          await uploadBytes(storageRef, newDrink.image);

          const downloadURL = await getDownloadURL(storageRef);
          newDrink.image = downloadURL; // Replace the File with the download URL
        } catch (error) {
          console.error('Error uploading image:', error);
          alert('Error uploading image.');
          return;
        }
      }

      // Remove 'docId' from the drink object before saving
      const { docId: _, ...drinkData } = newDrink;

      await setDoc(drinkRef, drinkData);
      setDrinks([...drinks, { ...newDrink, docId }]);
      alert('New drink added successfully.');
    } catch (error) {
      console.error('Error adding new drink:', error);
      alert('Error adding new drink. See console for details.');
    }
  };

  // Handle changes in packages data
  const handlePackageChange = (packageDocId: string, path: string[], value: any): void => {
    const updatedPackages = packages.map((pkg) => {
      if (pkg.docId === packageDocId) {
        const updatedPackage = { ...pkg };
        updateNestedData(updatedPackage, path, value);
        return updatedPackage;
      }
      return pkg;
    });
    setPackages(updatedPackages);
  };

  const savePackage = async (pkg: Package): Promise<void> => {
    const { docId } = pkg;
    if (!docId) return;

    // Handle image upload if the image field is a File object
    if (pkg.image instanceof File) {
      try {
        const storageRef = ref(storage, `public/images/packages/${docId}.png`);
        await uploadBytes(storageRef, pkg.image);

        const downloadURL = await getDownloadURL(storageRef);
        pkg.image = downloadURL;
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Error uploading image.');
        return;
      }
    }

    // Remove 'docId' from the pkg object before saving
    const { docId: _, ...packageData } = pkg;

    try {
      const packageRef = doc(db, 'packages', docId);
      await setDoc(packageRef, packageData);
      alert('Package saved successfully');
    } catch (error) {
      console.error('Error saving package:', error);
      alert('Error saving package.');
    }
  };

  const deletePackage = async (packageDocId: string): Promise<void> => {
    if (confirm('Are you sure you want to delete this package?')) {
      try {
        await deleteDoc(doc(db, 'packages', packageDocId));
        setPackages(packages.filter((pkg) => pkg.docId !== packageDocId));
        alert('Package deleted successfully.');
      } catch (error) {
        console.error('Error deleting package:', error);
        alert('Error deleting package.');
      }
    }
  };

  // Function to add a new package
  const addPackage = async (newPackage: Package): Promise<void> => {
    try {
      // Validate the package object
      if (!newPackage || !newPackage.slug || !newPackage.title) {
        alert('Please provide all necessary fields: slug and title.');
        return;
      }

      const docId = newPackage.slug;

      // Check if a package with the same docId already exists
      const packageRef = doc(db, 'packages', docId);
      const packageSnap = await getDoc(packageRef);

      if (packageSnap.exists()) {
        alert(`docID: ${docId} already exists. Please choose a different slug.`);
        return;
      }

      // Handle image upload if the image field is a File object
      if (newPackage.image instanceof File) {
        try {
          const storageRef = ref(storage, `public/images/packages/${docId}.png`);
          await uploadBytes(storageRef, newPackage.image);

          const downloadURL = await getDownloadURL(storageRef);
          newPackage.image = downloadURL;
        } catch (error) {
          console.error('Error uploading image:', error);
          alert('Error uploading image.');
          return;
        }
      }

      // Remove 'docId' from the package object before saving
      const { docId: _, ...packageData } = newPackage;

      await setDoc(packageRef, packageData);
      setPackages([...packages, { ...newPackage, docId }]);
      alert('New package added successfully.');
    } catch (error) {
      console.error('Error adding new package:', error);
      alert('Error adding new package. See console for details.');
    }
  };

  // Function to export collections
  const exportCollections = async (): Promise<void> => {
    try {
      const data: Record<string, any> = {};
      // Adjust the list of collections you want to export
      const collectionsToExport = ['drinks', 'orders', 'packages', 'sessions'];

      for (const collectionName of collectionsToExport) {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        const docsData: Record<string, any> = {};

        snapshot.forEach((document) => {
          docsData[document.id] = document.data();
        });

        data[collectionName] = docsData;
      }

      // Convert data to JSON string
      const jsonData = JSON.stringify(data, null, 2);

      // Trigger download
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `firebase_collections_structure_${timestamp}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting collections:', error);
      alert('Error exporting collections. See console for details.');
    }
  };

  // Handle logout
  const handleLogout = (): void => {
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

      {/* Export Collections Button */}
      <button
        onClick={exportCollections}
        className="mb-4 bg-blue-500 text-white px-4 py-2 rounded"
      >
        Export Collections
      </button>

      {loading ? (
        <Loading />
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
            onSavePackage={savePackage}
            onDeletePackage={deletePackage}
            onAddPackage={addPackage}
          />
        </>
      )}
    </div>
  );
}
