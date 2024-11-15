// pages/products/bland-selv-mix/[slug].js

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useBasket } from '../../../components/BasketContext';
import axios from 'axios';
import Loading from '/components/Loading';
import LoadingButton from '/components/LoadingButton'; // Import the LoadingButton component

export default function BlandSelvMixProduct() {
  const router = useRouter();
  const { slug } = router.query;

  const [product, setProduct] = useState(null);
  const [drinksData, setDrinksData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [selectedSize, setSelectedSize] = useState(null); // Will be set after fetching product
  const [maxProducts, setMaxProducts] = useState(0);

  const [isAddingToCart, setIsAddingToCart] = useState(false); // State for Add to Cart button

  const { addItemToBasket } = useBasket(); // Importing addItemToBasket from BasketContext

  // Load data from localStorage on mount
  useEffect(() => {
    if (!slug) return;

    const storedData = localStorage.getItem('slugBlandSelvMix');
    if (storedData) {
      const slugData = JSON.parse(storedData)[slug];
      if (slugData) {
        const { selectedSize, selectedProducts } = slugData;
        if (selectedSize) setSelectedSize(selectedSize);
        if (selectedProducts) setSelectedProducts(selectedProducts);
      }
    }
  }, [slug]);

  // Save data to localStorage whenever selectedSize or selectedProducts change
  useEffect(() => {
    if (!slug) return;

    const storedData = localStorage.getItem('slugBlandSelvMix');
    const allData = storedData ? JSON.parse(storedData) : {};

    const slugData = {
      selectedSize,
      selectedProducts,
    };

    allData[slug] = slugData;

    localStorage.setItem('slugBlandSelvMix', JSON.stringify(allData));
  }, [slug, selectedSize, selectedProducts]);

  useEffect(() => {
    if (!slug) return;

    const fetchProductAndDrinks = async () => {
      try {
        // Fetch product data
        const productResponse = await axios.get(`/api/firebase/products/${slug}`);
        const productData = productResponse.data.package;
        setProduct(productData);

        // Set default selected size if not already set
        if (!selectedSize && productData.packages && productData.packages.length > 0) {
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
  }, [slug, selectedSize]);

  // Update maxProducts whenever selectedSize changes
  useEffect(() => {
    if (selectedSize) {
      setMaxProducts(parseInt(selectedSize));
    }
  }, [selectedSize]);

  // Function to handle quantity changes
  const handleProductQuantityChange = (drinkSlug, action) => {
    setSelectedProducts((prevSelected) => {
      const currentQty = prevSelected[drinkSlug] || 0;
      let newQty = currentQty;

      if (action === 'increment' && getTotalSelected() < maxProducts) {
        newQty = currentQty + 1;
      } else if (action === 'decrement' && currentQty > 0) {
        newQty = currentQty - 1;
      }

      const updatedSelected = { ...prevSelected, [drinkSlug]: newQty };
      if (newQty === 0) {
        delete updatedSelected[drinkSlug];
      }

      return updatedSelected;
    });
  };

  // Calculate the total number of selected drinks
  const getTotalSelected = () => {
    return Object.values(selectedProducts).reduce((sum, qty) => sum + qty, 0);
  };

  // Function to add the selected products to the basket
  const addToBasket = async () => {
    if (getTotalSelected() !== maxProducts) {
      alert(`Please select exactly ${maxProducts} drinks.`);
      return;
    }

    setIsAddingToCart(true);
    try {
      // Create temporary selection using the provided API
      const response = await axios.post('/api/firebase/4-generateRandomSelection', {
        slug,
        selectedSize,
        selectedProducts,
        isCustomSelection: true, // Indicate that this is a custom selection
        sugarPreference: null, // Explicitly set sugarPreference to null
      });

      if (response.data.success) {
        const selectionId = response.data.selectionId;

        // Use BasketContext to add item to basket
        await addItemToBasket({ selectionId, quantity: 1 });

        // Clear selected products
        setSelectedProducts({});
        // Remove from localStorage
        const storedData = localStorage.getItem('slugBlandSelvMix');
        if (storedData) {
          const allData = JSON.parse(storedData);
          delete allData[slug];
          localStorage.setItem('slugBlandSelvMix', JSON.stringify(allData));
        }
      } else {
        console.error('Failed to create temporary selection:', response.data);
        alert('Failed to create selection. Please try again.');
      }
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
            {product.packages ? (
              product.packages.map((pkg) => (
                <label key={pkg.size} className="mr-4">
                  <input
                    type="radio"
                    name="size"
                    value={pkg.size}
                    checked={selectedSize === pkg.size}
                    onChange={() => setSelectedSize(pkg.size)}
                  />
                  {pkg.size} pcs
                </label>
              ))
            ) : (
              <p>No package sizes available.</p>
            )}
          </div>

          {/* Scrollable Drinks Selection */}
          <div className="mt-4 overflow-y-auto pr-4 max-h-96">
            <p>Select drinks (exactly {maxProducts}):</p>
            {Object.keys(drinksData).map((drinkSlug, index) => (
              <div key={index} className="flex items-center justify-between mt-2">
                <a href={`/drinks/${drinkSlug}`} className="flex items-center">
                  <img
                    src={drinksData[drinkSlug]?.image}
                    alt={drinksData[drinkSlug]?.name || drinkSlug}
                    className="w-12 h-12 object-cover mr-4"
                  />
                  <span>{drinksData[drinkSlug]?.name || drinkSlug}</span>
                </a>
                <div className="flex items-center">
                  <button
                    onClick={() => handleProductQuantityChange(drinkSlug, 'decrement')}
                    className="px-2 py-1 bg-gray-200 rounded-l"
                    disabled={!selectedProducts[drinkSlug]}
                  >
                    -
                  </button>
                  <span className="px-4 py-2 bg-gray-100">
                    {selectedProducts[drinkSlug] || 0}
                  </span>
                  <button
                    onClick={() => handleProductQuantityChange(drinkSlug, 'increment')}
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
          <LoadingButton
            onClick={addToBasket}
            loading={isAddingToCart}
            className="mt-6 bg-red-500 text-white px-6 py-2 rounded-full shadow hover:bg-red-600 transition w-full"
          >
            Add Mixed Package to Cart
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}
