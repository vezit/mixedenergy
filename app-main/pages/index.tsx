// pages/index.tsx

import React, { useState, useEffect, JSX } from 'react';
import Link from 'next/link';
import axios from 'axios';
import Loading from '../components/Loading';

// Define an interface for your product data
interface Product {
  id: string;
  slug: string;
  title: string;
  image?: string;
  description?: string;
  category?: string;
}

export default function Home(): JSX.Element {
  const [blandSelvMixProducts, setBlandSelvMixProducts] = useState<Product[]>([]);
  const [viBlanderForDigProducts, setViBlanderForDigProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get('/api/firebase/2-getPackages');
        const packagesData = response.data.packages as Product[]; // Make sure the API returns an array

        // Separate products by category
        const blandSelvMix = packagesData.filter(
          (product) => product.category === 'bland-selv-mix'
        );
        const viBlanderForDig = packagesData.filter(
          (product) => product.category === 'vi-blander-for-dig'
        );

        setBlandSelvMixProducts(blandSelvMix);
        setViBlanderForDigProducts(viBlanderForDig);
      } catch (error) {
        console.error('Error fetching packages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      {/* Top Section / Logo Background */}
      <div className="w-full" style={{ backgroundColor: '#212121' }}>
        <div
          className="w-full hidden lg:block"
          style={{
            height: '50vh',
            backgroundImage: "url('/images/mixedenergy-logo-with-background.png')",
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        ></div>
      </div>

      {/* "Vi blander for dig" Section */}
      <div className="w-full text-center py-6">
        <h1 className="text-3xl font-bold">Vi blander for dig</h1>
      </div>

      <div className="flex flex-wrap justify-center p-4 max-w-screen-xl mx-auto">
        {viBlanderForDigProducts.map((product) => (
          <Link
            href={`/products/vi-blander-for-dig/${product.slug}`}
            key={product.id}
            className="flex flex-col w-full md:w-1/2 lg:w-1/4 p-2"
          >
            <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
              <div className="w-full h-60">
                <img
                  src={product.image || '/images/placeholder.jpg'}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 flex-grow">
                <h2 className="text-xl font-bold">{product.title}</h2>
                {/* <p className="text-gray-700">{product.description}</p> */}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* "Bland selv mix" Section */}
      <div className="w-full text-center py-6">
        <h1 className="text-3xl font-bold">Bland selv mix</h1>
      </div>

      <div className="flex flex-wrap justify-center p-4 max-w-screen-xl mx-auto">
        {blandSelvMixProducts.map((product) => (
          <Link
            href={`/products/bland-selv-mix/${product.slug}`}
            key={product.id}
            className="flex flex-col w-full md:w-1/2 lg:w-1/4 p-2"
          >
            <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
              <div className="w-full h-60">
                <img
                  src={product.image || '/images/placeholder.jpg'}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 flex-grow">
                <h2 className="text-xl font-bold">{product.title}</h2>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
