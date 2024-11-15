// pages/products/vi-blander-for-dig/[slug].js

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useBasket } from '../../../components/BasketContext';
import axios from 'axios';
import Loading from '/components/Loading';
import LoadingButton from '/components/LoadingButton'; // Import the LoadingButton component
import FireworkAnimation from '/components/FireworkAnimation';

export default function ViBlanderForDigProduct() {
  const router = useRouter();
  const { slug } = router.query;

  const [product, setProduct] = useState(null);
  const [drinksData, setDrinksData] = useState({});
  const [loading, setLoading] = useState(true);

  const [selections, setSelections] = useState({});
  const [randomSelection, setRandomSelection] = useState({});
  const [selectionId, setSelectionId] = useState(null);

  const [price, setPrice] = useState(0);
  const [originalPrice, setOriginalPrice] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [sugarPreference, setSugarPreference] = useState('alle');

  const [isGenerating, setIsGenerating] = useState(false); // State for Generate button
  const [isAddingToCart, setIsAddingToCart] = useState(false); // State for Add to Cart button
  const [showFireworks, setShowFireworks] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const { addItemToBasket } = useBasket();

  // Function to generate a unique key for the current options
  const getSelectionKey = () => {
    return `${selectedSize}_${sugarPreference}`;
  };

  // Load selections from localStorage on initial mount
  useEffect(() => {
    if (!slug) return;

    const storedData = localStorage.getItem('slugViBlander');
    if (storedData) {
      const allSelections = JSON.parse(storedData);
      if (allSelections[slug]) {
        setSelections(allSelections[slug]);
      }
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;

    const fetchProductAndDrinks = async () => {
      try {
        // Fetch product data
        const productResponse = await axios.get(`/api/firebase/products/${slug}`);
        const productData = productResponse.data.package;
        setProduct(productData);

        // Set default selected size
        if (productData.packages && productData.packages.length > 0) {
          setSelectedSize(productData.packages[0].size);
        }

        // Fetch drinks data
        const drinksResponse = await axios.post('/api/firebase/3-getDrinksBySlugs', {
          slugs: productData.collectionsDrinks,
        });
        setDrinksData(drinksResponse.data.drinks);
      } catch (error) {
        console.error('Error fetching product or drinks:', error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProductAndDrinks();
  }, [slug]);

  // Effect to handle changes in options
  useEffect(() => {
    if (!product) return;

    const selectionKey = getSelectionKey();

    // Check if we already have a selection for the current options
    if (selections[selectionKey]) {
      const { selectedProducts, selectionId } = selections[selectionKey];
      setRandomSelection(selectedProducts);
      setSelectionId(selectionId);
      fetchPrice(selectedProducts);
    } else {
      // Generate a new package
      generateRandomPackage();
    }
  }, [selectedSize, sugarPreference]);

  
  const handleConfettiEnd = () => {
    setShowConfetti(false);
    alert('Product added to cart!');
  };

  // Function to generate a random package
  const generateRandomPackage = async () => {
    setIsGenerating(true);
    try {
      const response = await axios.post('/api/firebase/4-generateRandomSelection', {
        slug,
        selectedSize,
        sugarPreference,
      });

      if (response.data.success) {
        const { selectedProducts, selectionId } = response.data;
        setRandomSelection(selectedProducts);
        setSelectionId(selectionId);

        // Store the selection
        const selectionKey = getSelectionKey();
        const newSelections = {
          ...selections,
          [selectionKey]: { selectedProducts, selectionId },
        };
        setSelections(newSelections);

        // Save to localStorage
        const storedData = localStorage.getItem('slugViBlander');
        const allSelections = storedData ? JSON.parse(storedData) : {};
        allSelections[slug] = newSelections;
        localStorage.setItem('slugViBlander', JSON.stringify(allSelections));

        fetchPrice(selectedProducts);
      } else {
        console.error('Failed to generate package:', response.data);
        alert('Failed to generate package: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating package:', error);
      alert('Error generating package: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const fetchPrice = async (selection) => {
    try {
      const payload = {
        selectedSize,
        slug,
        selectedProducts: selection,
      };

      const response = await axios.post('/api/firebase/3-getCalculatedPackagePrice', payload);

      if (response.data.price) {
        setPrice(response.data.price); // Set the discounted price
        setOriginalPrice(response.data.originalPrice); // Set the original price
      } else {
        console.error('Price not returned from API:', response.data);
      }
    } catch (error) {
      console.error('Error fetching price:', error);
    }
  };

  // Function to handle package size change
  const handleSizeChange = (size) => {
    setSelectedSize(size);
  };

  // Function to add the random package to the basket
  const addToBasket = async () => {
    if (!selectionId) {
      alert('Please generate a package first.');
      return;
    }

    setIsAddingToCart(true);
    try {
      const mixedProduct = {
        selectionId,
        quantity: parseInt(quantity),
      };
      
      await addItemToBasket(mixedProduct);
      setShowConfetti(true); // Trigger confetti
    } catch (error) {
      console.error('Error adding to basket:', error);
      alert('Error adding to basket. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (loading) {
    return <Loading />;
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
              {product.packages ? (
                product.packages.map((pkg) => (
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
                ))
              ) : (
                <p>No package sizes available.</p>
              )}
            </div>

            {/* Sugar Preference Selection */}
            <div className="mt-4">
              <p>With or without sugar:</p>
              <label className="mr-4">
                <input
                  type="radio"
                  name="sugarPreference"
                  value="uden_sukker"
                  checked={sugarPreference === 'uden_sukker'}
                  onChange={() => setSugarPreference('uden_sukker')}
                />
                uden sukker
              </label>
              <label className="mr-4">
                <input
                  type="radio"
                  name="sugarPreference"
                  value="med_sukker"
                  checked={sugarPreference === 'med_sukker'}
                  onChange={() => setSugarPreference('med_sukker')}
                />
                med sukker
              </label>
              <label className="mr-4">
                <input
                  type="radio"
                  name="sugarPreference"
                  value="alle"
                  checked={sugarPreference === 'alle'}
                  onChange={() => setSugarPreference('alle')}
                />
                Alle (både med og uden sukker)
              </label>
            </div>

            {/* Display Random Package */}
            <div className="mt-4 h-[30rem] pr-4 border border-gray-300 rounded overflow-y-auto">
              <h2 className="text-xl font-bold text-center mt-4">
                {`Your Random ${product.title}`}
              </h2>
              <ul className="list-disc list-inside mt-4 px-4">
                {Object.entries(randomSelection).map(([drinkSlug, qty], index) => (
                  <li key={index}>
                    {drinksData[drinkSlug]?.name || drinkSlug} (x{qty})
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8">
            {/* Generate Button */}
            <LoadingButton
              onClick={generateRandomPackage}
              loading={isGenerating}
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-full shadow hover:bg-blue-600 transition w-full"
            >
              Generate New Package
            </LoadingButton>

            {/* Add to Basket Button */}
            <LoadingButton
              onClick={addToBasket}
              loading={isAddingToCart}
              className="mt-4 bg-red-500 text-white px-6 py-2 rounded-full shadow hover:bg-red-600 transition w-full"
            >
              Add to Cart
            </LoadingButton>

            {/* Price */}
            <div className="text-2xl font-bold mt-4">
              {originalPrice > price ? (
                <>
                  <span className="line-through text-gray-500 mr-2">
                    {(originalPrice / 100).toFixed(2)} kr
                  </span>
                  <span>{(price / 100).toFixed(2)} kr</span>
                </>
              ) : (
                <span>{(price / 100).toFixed(2)} kr</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
