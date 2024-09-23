import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Home() {
  const [products, setProducts] = useState([]);

  // Fetch products from Firebase
  useEffect(() => {
    const fetchProducts = async () => {
      const productsRef = collection(db, 'packages');
      const snapshot = await getDocs(productsRef);
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsData);
    };

    fetchProducts();
  }, []);

  if (!products.length) {
    return <p>Loading...</p>;
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="w-full" style={{ backgroundColor: '#212121' }}>
        <div className="w-full hidden lg:block" style={{ height: '50vh', backgroundImage: "url('/images/Color-logo-with-background.png')", backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}></div>
      </div>

      <div className="w-full text-center py-6">
        <h1 className="text-3xl font-bold">Bland selv mix</h1>
      </div>

      <div className="flex flex-wrap justify-center p-4 max-w-screen-xl mx-auto">
        {products.map((product) => (
          <Link href={`/products/bland-selv-mix/${product.id}`} key={product.id}>
            <a className="flex flex-col w-full md:w-1/2 lg:w-1/4 p-2">
              <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
                <div className="w-full h-60">
                  <img src={product.image || '/images/placeholder.jpg'} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-4 flex-grow">
                  <h2 className="text-xl font-bold">{product.name}</h2>
                  <p className="text-gray-700">{product.description}</p>
                </div>
              </div>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}
