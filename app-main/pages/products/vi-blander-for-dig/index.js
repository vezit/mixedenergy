// pages/products/vi-blander-for-dig/index.js

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useBasket } from '../../../lib/BasketContext';
import Link from 'next/link';

export default function ViBlanderForDig() {
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

  useEffect(() => {
    const prices = { '8': 175, '12': 220, '18': 299 };
    setPrice(prices[selectedSize]);

    // Generate a random selection on page load and when the size changes
    generateRandomSelection();
  }, [selectedSize]);

  const generateRandomSelection = () => {
    const newSelection = {};
    let remaining = maxProducts;

    while (remaining > 0) {
      const randomProduct = allProducts[Math.floor(Math.random() * allProducts.length)];
      if (!newSelection[randomProduct]) {
        newSelection[randomProduct] = 1;
        remaining -= 1;
      }
    }

    setSelectedProducts(newSelection);
  };

  const regenerateSelection = () => {
    generateRandomSelection();
  };

  const addMixedToBasket = () => {
    const totalSelected = Object.values(selectedProducts).reduce((acc, qty) => acc + qty, 0);

    if (totalSelected !== maxProducts) {
      alert('Der opstod en fejl. Prøv igen.');
      return;
    }

    const mixedProduct = {
      title: `Vi Blander For Dig - ${selectedSize} stk`,
      description: `En blanding af følgende drikkevarer: ${Object.keys(selectedProducts).join(', ')}`,
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
      <h1 className="text-5xl font-bold text-center mb-8">Vi Blander For Dig</h1>

      <div className="flex flex-row items-start justify-center w-full max-w-4xl gap-8">
        {/* Image and description */}
        <div className="flex-shrink-0">
          <div className="w-[500px]">
            <Image
              src="/images/vi-blander-for-dig.jpg" // Replace with your actual image path
              alt="Vi Blander For Dig"
              width={500}
              height={500}
              className="rounded-lg shadow-lg"
            />
            <div className="mt-6">
              <h2 className="text-2xl font-bold mb-2">Beskrivelse</h2>
              <p className="text-lg text-gray-700">
                Vi blander en spændende kasse med energidrikke til dig. Lad os overraske dig!
              </p>
            </div>
          </div>
        </div>

        {/* Product display */}
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

          {/* Randomly generated selection */}
          <div className="mt-4">
            <p>Din tilfældige blanding:</p>
            {Object.entries(selectedProducts).map(([product, qty], index) => (
              <div key={index} className="flex items-center justify-between mt-2">
                <span>{product}</span>
                <span>{qty}</span>
              </div>
            ))}
            <button
              onClick={regenerateSelection}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600 transition"
            >
              Generer ny blanding
            </button>
          </div>

          {/* Add to basket button */}
          <button
            onClick={addMixedToBasket}
            className="mt-6 bg-red-500 text-white px-6 py-2 rounded-full shadow hover:bg-red-600 transition"
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
