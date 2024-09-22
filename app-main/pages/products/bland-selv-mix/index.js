// pages/products/bland-selv-mix/index.js

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useBasket } from '../../../lib/BasketContext';
import productsData from '../../../lib/products'; // Adjust the path as necessary
import Link from 'next/link';

export default function BlandSelvMix() {
  const [selectedSize, setSelectedSize] = useState('8');
  const [selectedProducts, setSelectedProducts] = useState({});
  const [price, setPrice] = useState(175);
  const { addItemToBasket } = useBasket();

  const allProducts = [
    'Red Bull Original - 0.25 l',
    'Red Bull Sugarfree - 0.25 l',
    'Red Bull Zero - 0.25 l',
    'Red Bull Original Large - 0.355 l',
    'Red Bull Sugarfree Large - 0.473 l',
    'Red Bull Red Edition Watermelon - 0.25 l',
    'Red Bull Blue Edition - 0.25 l',
    'Red Bull Apricot Edition - 0.25 l',
    'Red Bull Purple Edition - 0.25 l',
    'Red Bull Summer Edition - 0.25 l',
  ];

  const maxProducts = parseInt(selectedSize);
  const totalSelected = Object.values(selectedProducts).reduce((acc, qty) => acc + qty, 0);

  useEffect(() => {
    // Update price based on selected size
    const prices = { '8': 175, '12': 220, '18': 299 };
    setPrice(prices[selectedSize]);

    // Generate a random selection when the page loads or when the size changes
    generateRandomSelection();
  }, [selectedSize]);

  const generateRandomSelection = () => {
    const newSelection = {};
    let remaining = maxProducts;

    while (remaining > 0) {
      const randomProduct = allProducts[Math.floor(Math.random() * allProducts.length)];
      const qty = 1; // You can adjust this logic as needed
      if (newSelection[randomProduct]) {
        continue; // Skip if already selected
      } else {
        newSelection[randomProduct] = qty;
        remaining -= qty;
      }
    }

    setSelectedProducts(newSelection);
  };

  const handleProductQuantityChange = (product, action) => {
    setSelectedProducts((prevSelected) => {
      const currentQty = prevSelected[product] || 0;

      if (action === 'increment' && totalSelected < maxProducts) {
        return { ...prevSelected, [product]: currentQty + 1 };
      }

      if (action === 'decrement' && currentQty > 0) {
        const updated = { ...prevSelected, [product]: currentQty - 1 };
        if (updated[product] === 0) delete updated[product];
        return updated;
      }

      return prevSelected;
    });
  };

  const addMixedToBasket = () => {
    if (totalSelected !== maxProducts) {
      alert(`Vælg præcis ${maxProducts} produkter.`);
      return;
    }

    const mixedProduct = {
      title: `Bland Selv Mix - ${selectedSize} stk`,
      description: `En blanding af følgende drikkevarer: ${Object.entries(selectedProducts)
        .map(([product, qty]) => `${product} (x${qty})`)
        .join(', ')}`,
      price,
      quantity: 1,
      selectedSize,
      selectedProducts,
    };

    addItemToBasket(mixedProduct);
    // Optionally redirect to the basket page
    // router.push('/basket');
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-8">
      <h1 className="text-5xl font-bold text-center mb-8">Bland Selv Mix</h1>

      <div className="flex flex-row items-start justify-center w-full max-w-4xl gap-8">
        {/* Image and description */}
        <div className="flex-shrink-0">
          <div className="w-[500px]">
            <Image
              src="/images/bland-selv-mix.jpg" // Replace with your actual image path
              alt="Bland Selv Mix"
              width={500}
              height={500}
              className="rounded-lg shadow-lg"
            />
            <div className="mt-6">
              <h2 className="text-2xl font-bold mb-2">Beskrivelse</h2>
              <p className="text-lg text-gray-700">
                Vælg dine favoritdrikke og bland din egen unikke kasse!
              </p>
            </div>
          </div>
        </div>

        {/* Product selection */}
        <div className="flex-grow self-start">
          {/* Package size selection */}
          <div className="mt-0">
            <p>Vælg størrelse:</p>
            {['8', '12', '18'].map((size) => (
              <label key={size} className="mr-4">
                <input
                  type="radio"
                  name="size"
                  value={size}
                  checked={selectedSize === size}
                  onChange={() => setSelectedSize(size)}
                />
                {size}
              </label>
            ))}
          </div>

          {/* Product selection */}
          <div className="mt-4">
            <p>Vælg produkter (præcis {maxProducts}):</p>
            {allProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between mt-2">
                <span>{product}</span>
                <div className="flex items-center">
                  <button
                    onClick={() => handleProductQuantityChange(product, 'decrement')}
                    className="px-2 py-1 bg-gray-200 rounded-l"
                    disabled={!selectedProducts[product]}
                  >
                    -
                  </button>
                  <span className="px-4 py-2 bg-gray-100">
                    {selectedProducts[product] || 0}
                  </span>
                  <button
                    onClick={() => handleProductQuantityChange(product, 'increment')}
                    className="px-2 py-1 bg-gray-200 rounded-r"
                    disabled={totalSelected >= maxProducts}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
            <p className="mt-2 text-red-600">
              Du har valgt {totalSelected} af {maxProducts} produkter.
            </p>
          </div>

          {/* Add to basket button */}
          <button
            onClick={addMixedToBasket}
            className="mt-6 bg-red-500 text-white px-6 py-2 rounded-full shadow hover:bg-red-600 transition"
            disabled={totalSelected !== maxProducts}
          >
            Tilføj til kurv
          </button>

          {/* Price */}
          <p className="text-2xl font-bold mt-4">{price} kr</p>

          {/* Link to drinks list */}
          <Link href="/drinks">
            <a className="mt-4 text-blue-500 hover:underline">Liste over drikkevarer</a>
          </Link>
        </div>
      </div>
    </div>
  );
}
