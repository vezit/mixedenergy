// pages/products/bland-selv-mix/[slug].js

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useBasket } from '../../../lib/BasketContext';
import products from '../../../lib/products';
import Link from 'next/link';

export default function BlandSelvMixProduct() {
  const router = useRouter();
  const { slug } = router.query;

  // Ensure the router is ready
  if (!router.isReady) {
    return <p>Loading...</p>;
  }

  const product = products[slug];

  if (!product || product.category !== 'bland-selv-mix') {
    return <p>Product not found.</p>;
  }

  const { addItemToBasket } = useBasket();

  // List of available drinks
  const allDrinks = [
    'Red Bull Original - 0.25 l',
    'Red Bull Sugarfree - 0.25 l',
    'Red Bull Zero - 0.25 l',
    'Monster Energy - 0.5 l',
    'Monster Ultra - 0.5 l',
    'Booster Original - 0.5 l',
    'Booster Sugarfree - 0.5 l',
    // Add more drinks as needed
  ];

  const [selectedSize, setSelectedSize] = useState('8'); // Default package size
  const [selectedProducts, setSelectedProducts] = useState({});
  const [price, setPrice] = useState(175); // Default price for size 8
  const [quantity, setQuantity] = useState(1);
  const maxProducts = parseInt(selectedSize);

  // Generate a random selection on component mount
  useEffect(() => {
    generateRandomSelection(selectedSize);
  }, []);

  // Update price and regenerate selection when package size changes
  useEffect(() => {
    if (selectedSize === '8') {
      setPrice(175);
    } else if (selectedSize === '12') {
      setPrice(220);
    } else if (selectedSize === '18') {
      setPrice(299);
    }

    generateRandomSelection(selectedSize);
  }, [selectedSize]);

  // Function to generate a random selection of drinks
  const generateRandomSelection = (size) => {
    const randomSelection = {};
    let remaining = parseInt(size);
    const drinksCopy = [...allDrinks];

    while (remaining > 0) {
      const randomIndex = Math.floor(Math.random() * drinksCopy.length);
      const drink = drinksCopy[randomIndex];
      const maxQty = remaining;
      const qty = Math.ceil(Math.random() * maxQty);

      randomSelection[drink] = (randomSelection[drink] || 0) + qty;
      remaining -= qty;

      // Remove the drink if no more can be added
      if (remaining <= 0) break;

      drinksCopy.splice(randomIndex, 1);
    }

    setSelectedProducts(randomSelection);
  };

  // Function to handle quantity changes
  const handleProductQuantityChange = (drink, action) => {
    setSelectedProducts((prevSelected) => {
      const currentQty = prevSelected[drink] || 0;
      let newQty = currentQty;

      if (action === 'increment' && getTotalSelected() < maxProducts) {
        newQty = currentQty + 1;
      } else if (action === 'decrement' && currentQty > 0) {
        newQty = currentQty - 1;
      }

      const updatedSelected = { ...prevSelected, [drink]: newQty };
      if (newQty === 0) {
        delete updatedSelected[drink];
      }

      return updatedSelected;
    });
  };

  // Calculate the total number of selected drinks
  const getTotalSelected = () => {
    return Object.values(selectedProducts).reduce((sum, qty) => sum + qty, 0);
  };

  // Function to add the selected products to the basket
  const addToBasket = () => {
    if (getTotalSelected() !== maxProducts) {
      alert(`Please select exactly ${maxProducts} drinks.`);
      return;
    }

    const mixedProduct = {
      slug: product.slug,
      title: `${product.title} - ${selectedSize} pcs`,
      description: `A mix of: ${Object.entries(selectedProducts)
        .map(([drink, qty]) => `${drink} (x${qty})`)
        .join(', ')}`,
      image: product.image,
      price: price * quantity,
      quantity: quantity,
      selectedSize: selectedSize,
      selectedProducts: selectedProducts,
    };

    addItemToBasket(mixedProduct);
    // Optionally redirect to basket page
    // router.push('/basket');
  };

  return (
    <div className="container mx-auto p-8">
      {/* Product Title */}
      <h1 className="text-4xl font-bold text-center mb-8">{product.title}</h1>

      <div className="flex flex-col md:flex-row">
        {/* Left Column: Image and Description */}
        <div className="md:w-1/2">
          <img src={product.image} alt={product.title} className="w-full h-auto" />

          {/* Description */}
          <div className="mt-6">
            <h2 className="text-2xl font-bold mb-2">Description</h2>
            <p className="text-lg text-gray-700">{product.description}</p>
          </div>
        </div>

        {/* Right Column: Selection and Actions */}
        <div className="md:w-1/2 md:pl-8">
          {/* Package Size Selection */}
          <div className="mt-4">
            <p>Select Package Size:</p>
            <label className="mr-4">
              <input
                type="radio"
                name="size"
                value="8"
                checked={selectedSize === '8'}
                onChange={() => setSelectedSize('8')}
              />
              8
            </label>
            <label className="mr-4">
              <input
                type="radio"
                name="size"
                value="12"
                checked={selectedSize === '12'}
                onChange={() => setSelectedSize('12')}
              />
              12
            </label>
            <label>
              <input
                type="radio"
                name="size"
                value="18"
                checked={selectedSize === '18'}
                onChange={() => setSelectedSize('18')}
              />
              18
            </label>
          </div>

          {/* Drinks Selection */}
          <div className="mt-4">
            <p>Select drinks (exactly {maxProducts}):</p>
            {allDrinks.map((drink, index) => (
              <div key={index} className="flex items-center justify-between mt-2">
                <span>{drink}</span>
                <div className="flex items-center">
                  <button
                    onClick={() => handleProductQuantityChange(drink, 'decrement')}
                    className="px-2 py-1 bg-gray-200 rounded-l"
                    disabled={!selectedProducts[drink]}
                  >
                    -
                  </button>
                  <span className="px-4 py-2 bg-gray-100">
                    {selectedProducts[drink] || 0}
                  </span>
                  <button
                    onClick={() => handleProductQuantityChange(drink, 'increment')}
                    className="px-2 py-1 bg-gray-200 rounded-r"
                    disabled={getTotalSelected() >= maxProducts}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
            <p className="mt-2 text-red-600">
              You have selected {getTotalSelected()} out of {maxProducts} drinks.
            </p>
          </div>

          {/* Add to Basket Button */}
          <button
            onClick={addToBasket}
            className="mt-6 bg-red-500 text-white px-6 py-2 rounded-full shadow hover:bg-red-600 transition"
          >
            Add Mixed Package to Cart
          </button>

          {/* Price */}
          <p className="text-2xl font-bold mt-4">{price * quantity} kr</p>
        </div>
      </div>
    </div>
  );
}
