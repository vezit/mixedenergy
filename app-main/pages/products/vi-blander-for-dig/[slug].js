import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useBasket } from '../../../lib/BasketContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import Link from 'next/link';

export default function ViBlanderForDigProduct() {
  const router = useRouter();
  const { slug } = router.query;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [randomSelection, setRandomSelection] = useState({});
  const [price, setPrice] = useState(175); // Default price for size 8
  const [selectedSize, setSelectedSize] = useState('8'); // Default package size
  const [quantity, setQuantity] = useState(1);

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
  ];

  useEffect(() => {
    if (!slug) return;

    const fetchProduct = async () => {
      const docRef = doc(db, 'packages', slug);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProduct({ id: docSnap.id, ...docSnap.data() });
      } else {
        setProduct(null);
      }
      setLoading(false);
    };

    fetchProduct();
  }, [slug]);

  // Generate a random package on component mount
  useEffect(() => {
    generateRandomPackage(selectedSize);
  }, []);

  // Update price when package size changes
  useEffect(() => {
    if (selectedSize === '8') {
      setPrice(175);
    } else if (selectedSize === '12') {
      setPrice(220);
    } else if (selectedSize === '18') {
      setPrice(299);
    }
  }, [selectedSize]);

  // Function to generate a random package
  const generateRandomPackage = (size) => {
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

    setRandomSelection(randomSelection);
  };

  // Function to handle package size change
  const handleSizeChange = (size) => {
    setSelectedSize(size);
    generateRandomPackage(size);
  };

  // Function to add the random package to the basket
  const addToBasket = () => {
    const totalSelected = Object.values(randomSelection).reduce((sum, qty) => sum + qty, 0);
    if (totalSelected !== parseInt(selectedSize)) {
      alert(`Error generating the package. Please try again.`);
      return;
    }

    const mixedProduct = {
      slug: product.id,
      title: `${product.name} - ${selectedSize} pcs`,
      description: `A mix of: ${Object.entries(randomSelection)
        .map(([drink, qty]) => `${drink} (x${qty})`)
        .join(', ')}`,
      image: product.image,
      price: price * quantity,
      quantity: quantity,
      selectedSize: selectedSize,
      selectedProducts: randomSelection,
    };

    addItemToBasket(mixedProduct);
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!product) {
    return <p>Product not found.</p>;
  }

  return (
    <div className="container mx-auto p-8">
      {/* Product Title */}
      <h1 className="text-4xl font-bold text-center mb-8">{product.name}</h1>

      <div className="flex flex-col md:flex-row">
        {/* Left Column: Image and Description */}
        <div className="md:w-1/2">
          <img src={product.image} alt={product.name} className="w-full h-auto" />

          {/* Description */}
          <div className="mt-6">
            <h2 className="text-2xl font-bold mb-2">Description</h2>
            <p className="text-lg text-gray-700">{product.description}</p>
          </div>
        </div>

        {/* Right Column: Random Package and Actions */}
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
                onChange={() => handleSizeChange('8')}
              />
              8
            </label>
            <label className="mr-4">
              <input
                type="radio"
                name="size"
                value="12"
                checked={selectedSize === '12'}
                onChange={() => handleSizeChange('12')}
              />
              12
            </label>
            <label>
              <input
                type="radio"
                name="size"
                value="18"
                checked={selectedSize === '18'}
                onChange={() => handleSizeChange('18')}
              />
              18
            </label>
          </div>

          {/* Display Random Package */}
          <div className="mt-4 max-h-[500px] overflow-y-auto pr-4"> {/* Scrollable container */}
            <h2 className="text-xl font-bold">Your Random Package</h2>
            <ul className="list-disc list-inside">
              {Object.entries(randomSelection).map(([drink, qty], index) => (
                <li key={index}>
                  {drink} (x{qty})
                </li>
              ))}
            </ul>
          </div>

          {/* Generate Button */}
          <button
            onClick={() => generateRandomPackage(selectedSize)}
            className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-full shadow hover:bg-blue-600 transition"
          >
            Generate New Package
          </button>

          {/* Add to Basket Button */}
          <button
            onClick={addToBasket}
            className="mt-4 bg-red-500 text-white px-6 py-2 rounded-full shadow hover:bg-red-600 transition"
          >
            Add to Cart
          </button>

          {/* Price */}
          <p className="text-2xl font-bold mt-4">{price * quantity} kr</p>
        </div>
      </div>
    </div>
  );
}
