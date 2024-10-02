// /products/vi-blander-for-dig/[slug].js
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useBasket } from '../../../lib/BasketContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function ViBlanderForDigProduct() {
  const router = useRouter();
  const { slug } = router.query;

  const [product, setProduct] = useState(null);
  const [drinksData, setDrinksData] = useState({});
  const [loading, setLoading] = useState(true);
  const [randomSelection, setRandomSelection] = useState({});
  const [price, setPrice] = useState(0); // Initialize price to 0
  const [selectedSize, setSelectedSize] = useState(8); // Default to the smallest package size (8)
  const [quantity, setQuantity] = useState(1);

  const { addItemToBasket } = useBasket();

  useEffect(() => {
    if (!slug) return;

    const fetchProduct = async () => {
      const docRef = doc(db, 'packages_public', slug);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const productData = docSnap.data();
        setProduct({ id: docSnap.id, ...productData });

        // Fetch drinks data
        const drinksData = {};
        for (const drinkSlug of productData.drinks) {
          const drinkDocRef = doc(db, 'drinks_public', drinkSlug);
          const drinkDocSnap = await getDoc(drinkDocRef);
          if (drinkDocSnap.exists()) {
            drinksData[drinkSlug] = drinkDocSnap.data();
          }
        }
        setDrinksData(drinksData);

        // Generate the random package on load
        generateRandomPackage(selectedSize, drinksData);
      } else {
        setProduct(null);
      }
      setLoading(false);
    };

    fetchProduct();
  }, [slug]);

  const calculateTotalPrice = (selection) => {
    let totalPrice = 0;
    for (const [drinkSlug, qty] of Object.entries(selection)) {
      const drink = drinksData[drinkSlug];
      if (drink && drink.salePrice) {
        totalPrice += parseInt(drink.salePrice) * qty;
      }
    }
    return totalPrice;
  };

  // Function to generate a random package
  const generateRandomPackage = (size, drinksDataParam = drinksData) => {
    if (!product) return;

    const randomSelection = {};
    let remaining = parseInt(size);
    const drinksCopy = [...product.drinks];

    while (remaining > 0 && drinksCopy.length > 0) {
      const randomIndex = Math.floor(Math.random() * drinksCopy.length);
      const drinkSlug = drinksCopy[randomIndex];
      const drink = drinksDataParam[drinkSlug];
      if (!drink) {
        drinksCopy.splice(randomIndex, 1);
        continue;
      }
      const qty = 1; // Select one at a time
      randomSelection[drinkSlug] = (randomSelection[drinkSlug] || 0) + qty;
      remaining -= qty;
    }

    setRandomSelection(randomSelection);

    // Calculate price
    const totalPrice = calculateTotalPrice(randomSelection);
    setPrice(totalPrice);
  };

  // Function to handle package size change
  const handleSizeChange = (size) => {
    setSelectedSize(size);
    generateRandomPackage(size);
  };

  // Function to add the random package to the basket
  const addToBasket = () => {
    const totalSelected = Object.values(randomSelection).reduce(
      (sum, qty) => sum + qty,
      0
    );
    if (totalSelected !== parseInt(selectedSize)) {
      alert("Error generating the package. Please try again.");
      return;
    }

    const mixedProduct = {
      slug: product.id,
      title: `${product.title} - ${selectedSize} pcs`,
      description: `A mix of: ${Object.entries(randomSelection)
        .map(([drinkSlug, qty]) => `${drinksData[drinkSlug]?.name || drinkSlug} (x${qty})`)
        .join(', ')}`,
      image: product.image,
      price: price, // Total price per package
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
      <h1 className="text-4xl font-bold text-center mb-8">{product.title}</h1>

      <div className="flex flex-col md:flex-row">
        {/* Left Column: Image and Description */}
        <div className="md:w-1/2 flex-1">
          <img src={product.image} alt={product.title} className="w-full h-auto" />

          {/* Description */}
          <div className="mt-6">
            <h2 className="text-2xl font-bold mb-2">Description</h2>
            <p className="text-lg text-gray-700">{product.description}</p>
          </div>
        </div>

        {/* Right Column: Random Package and Actions */}
        <div className="md:w-1/2 md:pl-8 flex flex-col justify-between h-full flex-1">
          <div>
            {/* Package Size Selection */}
            <div className="mt-4">
              <p>Select Package Size:</p>
              {product.packages.map((pkg) => (
                <label key={pkg.size} className="mr-4">
                  <input
                    type="radio"
                    name="size"
                    value={pkg.size}
                    checked={selectedSize === pkg.size}
                    onChange={() => handleSizeChange(pkg.size)}
                  />
                  {pkg.size} pcs
                </label>
              ))}
            </div>

            {/* Display Random Package */}
            <div className="mt-4 max-h-[200px] overflow-y-auto pr-4">
              <h2 className="text-xl font-bold">Din Random {product.title}</h2>
              <ul className="list-disc list-inside">
                {Object.entries(randomSelection).map(([drinkSlug, qty], index) => (
                  <li key={index}>
                    {drinksData[drinkSlug]?.name || drinkSlug} (x{qty})
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8"> {/* Moving buttons here */}
            {/* Generate Button */}
            <button
              onClick={() => generateRandomPackage(selectedSize)}
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-full shadow hover:bg-blue-600 transition w-full"
            >
              Generate New Package
            </button>

            {/* Add to Basket Button */}
            <button
              onClick={addToBasket}
              className="mt-4 bg-red-500 text-white px-6 py-2 rounded-full shadow hover:bg-red-600 transition w-full"
            >
              Add to Cart
            </button>

            {/* Price */}
            <p className="text-2xl font-bold mt-4">{(price * quantity / 100).toFixed(2)} kr</p>
          </div>
        </div>
      </div>
    </div>
  );
}
