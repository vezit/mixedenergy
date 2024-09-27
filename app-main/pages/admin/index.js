// app-main/pages/admin/index.js

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
  const handleDrinkChange = (index, field, value) => {
    const updatedDrinks = [...drinks];
    updatedDrinks[index][field] = value;
    setDrinks(updatedDrinks);
  };

  // Handle changes in packages data
  const handlePackageChange = (index, field, value) => {
    const updatedPackages = [...packages];
    updatedPackages[index][field] = value;
    setPackages(updatedPackages);
  };

  const saveDrink = async (drink) => {
    const drinkRef = doc(db, 'drinks', drink.id);
    try {
      await updateDoc(drinkRef, {
        name: drink.name,
        stock: Number(drink.stock),
        size: drink.size,
        isSugarFree: drink.isSugarFree,
        salePrice: Number(drink.salePrice),
        purchasePrice: Number(drink.purchasePrice),
        packageQuantity: Number(drink.packageQuantity),
      });
      alert('Drink saved successfully');
    } catch (error) {
      console.error('Error saving drink:', error);
      alert('Error saving drink.');
    }
  };


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
          const isValid = validateData(data, file.name);
          if (isValid) {
            setUploadedData({ data, dataType: file.name.includes('drinks') ? 'drinks' : 'packages' });
            setShowModal(true);
          } else {
            alert('Invalid data format.');
          }
        } catch (error) {
          alert('Failed to parse JSON file.');
        }
      };
      reader.readAsText(file);
    }
  };

  // Validate uploaded data
  const validateData = (data, fileName) => {
    if (fileName.includes('drinks')) {
      // Basic validation for drinks data
      return Object.values(data).every(drink => drink.name && drink.size && drink.salePrice);
    } else if (fileName.includes('packages')) {
      // Basic validation for packages data
      return Object.values(data).every(pkg => pkg.title && pkg.price && pkg.drinks);
    }
    return false;
  };

  // Confirm overwrite of data
  const handleConfirmOverwrite = async () => {
    setShowModal(false);
    const { data, dataType } = uploadedData;

    const idToken = await auth.currentUser.getIdToken();

    const response = await fetch('/api/admin/uploadData', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        data,
        dataType,
      }),
    });

    if (response.ok) {
      alert('Data updated successfully.');
      // Refresh data
      fetchData();
    } else {
      alert('Failed to update data.');
    }
  };

  return (
    <div>
      <h1>Welcome to the Admin Management Page</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <DrinksTable drinks={drinks} onDrinkChange={handleDrinkChange} onSaveDrink={saveDrink} />

          <PackagesTable
  packages={packages}
  drinks={drinks}
  onPackageChange={handlePackageChange}
  onSavePackage={onSavePackage} // Ensure this line is present
/>


          <div>
            <h2>Upload Drinks or Packages JSON</h2>
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
