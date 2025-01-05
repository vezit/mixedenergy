// pages/products/bland-selv-mix/[slug].js

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  MouseEventHandler,
} from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Image from 'next/image';

import Loading from '../../../components/Loading';
import LoadingConfettiButton from '../../../components/LoadingConfettiButton';
import ConfettiAnimation from '../../../components/ConfettiAnimation';
import { useBasket } from '../../../components/BasketContext';

// ------------------
// Type Definitions
// ------------------
interface ProductPackage {
  size: number;
}

interface ProductType {
  title: string;
  image: string;
  description: string;
  packages?: ProductPackage[];
  collectionsDrinks?: string[];
}

interface DrinkData {
  name: string;
  image: string;
}

type DrinksDataType = Record<string, DrinkData>; // e.g. { "coca-cola-zero": { name: "Coca Cola Zero", image: "..." }, ... }
type SelectedProductsType = Record<string, number>; // e.g. { "coca-cola-zero": 2, "pepsi-max": 3 }

const BlandSelvMixProduct: React.FC = () => {
  const router = useRouter();
  const slug = router.query.slug as string | undefined;

  const addToCartButtonRef = useRef<HTMLButtonElement | null>(null); // Ref for the "Add to Cart" button

  const [product, setProduct] = useState<ProductType | null>(null);
  const [drinksData, setDrinksData] = useState<DrinksDataType>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProductsType>({});
  const [selectedSize, setSelectedSize] = useState<number | null>(null); // will be set after fetching product
  const [maxProducts, setMaxProducts] = useState<number>(0);

  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  const { addItemToBasket } = useBasket();

  // ---------------
  // Local Storage
  // ---------------
  // Load data from localStorage on mount
  useEffect(() => {
    if (!slug) return;

    const storedData = localStorage.getItem('slugBlandSelvMix');
    if (storedData) {
      const allSlugsData = JSON.parse(storedData) as Record<
        string,
        {
          selectedSize: number | null;
          selectedProducts: SelectedProductsType;
        }
      >;
      if (allSlugsData[slug]) {
        const { selectedSize: storedSize, selectedProducts: storedProducts } =
          allSlugsData[slug];
        if (storedSize) setSelectedSize(storedSize);
        if (storedProducts) setSelectedProducts(storedProducts);
      }
    }
  }, [slug]);

  // Save data to localStorage whenever selectedSize or selectedProducts change
  useEffect(() => {
    if (!slug) return;

    const storedData = localStorage.getItem('slugBlandSelvMix');
    const allData = storedData ? JSON.parse(storedData) : {};

    allData[slug] = {
      selectedSize,
      selectedProducts,
    };

    localStorage.setItem('slugBlandSelvMix', JSON.stringify(allData));
  }, [slug, selectedSize, selectedProducts]);

  // ---------------
  // Fetch data
  // ---------------
  useEffect(() => {
    if (!slug) return;

    const fetchProductAndDrinks = async () => {
      setLoading(true);
      try {
        // Fetch product data
        const productResponse = await axios.get(`/api/firebase/products/${slug}`);
        const productData: ProductType = productResponse.data.package;
        setProduct(productData);

        // If selectedSize not set, use the first available package
        if (!selectedSize && productData.packages && productData.packages.length > 0) {
          setSelectedSize(productData.packages[0].size);
        }

        // Fetch drinks data
        if (productData.collectionsDrinks && productData.collectionsDrinks.length > 0) {
          const drinksResponse = await axios.post('/api/firebase/3-getDrinksBySlugs', {
            slugs: productData.collectionsDrinks,
          });
          setDrinksData(drinksResponse.data.drinks as DrinksDataType);
        }
      } catch (error) {
        console.error('Error fetching product or drinks:', error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchProductAndDrinks();
  }, [slug, selectedSize]);

  // Update maxProducts whenever selectedSize changes
  useEffect(() => {
    if (selectedSize) {
      setMaxProducts(selectedSize);
    }
  }, [selectedSize]);

  // ---------------
  // Handlers
  // ---------------
  // Calculate the total number of selected drinks
  const getTotalSelected = useCallback((): number => {
    return Object.values(selectedProducts).reduce((sum, qty) => sum + qty, 0);
  }, [selectedProducts]);

  // Function to handle quantity changes
  const handleProductQuantityChange = (drinkSlug: string, action: 'increment' | 'decrement') => {
    setSelectedProducts((prevSelected) => {
      const currentQty = prevSelected[drinkSlug] || 0;
      let newQty = currentQty;

      if (action === 'increment' && getTotalSelected() < maxProducts) {
        newQty = currentQty + 1;
      } else if (action === 'decrement' && currentQty > 0) {
        newQty = currentQty - 1;
      }

      const updatedSelected = { ...prevSelected, [drinkSlug]: newQty };
      if (updatedSelected[drinkSlug] === 0) {
        delete updatedSelected[drinkSlug];
      }

      return updatedSelected;
    });
  };

  // Create a temporary selection
  const createTemporarySelection = async (): Promise<string | null> => {
    try {
      // Create temporary selection using the provided API
      const response = await axios.post('/api/firebase/4-generateRandomSelection', {
        slug,
        selectedSize,
        selectedProducts,
        isCustomSelection: true, // Indicate that this is a custom selection
        sugarPreference: null,   // We can explicitly set sugarPreference to null or omit it
      });

      if (response.data.success) {
        const selectionId = response.data.selectionId as string;
        return selectionId;
      } else {
        console.error('Failed to create temporary selection:', response.data);
        alert('Failed to create selection. Please try again.');
        return null;
      }
    } catch (error) {
      console.error('Error creating temporary selection:', error);
      alert('Error creating selection. Please try again.');
      return null;
    }
  };

  // Add the selected products to the basket
  const addToBasket = async () => {
    if (getTotalSelected() !== maxProducts) {
      alert(`Please select exactly ${maxProducts} drinks.`);
      return;
    }

    setIsAddingToCart(true);
    try {
      // 1) Create temporary selection
      const selectionId = await createTemporarySelection();
      if (!selectionId) {
        // Failed to create temporary selection
        return;
      }

      // 2) Use BasketContext to add item to basket
      await addItemToBasket({ selectionId, quantity: 1 });
      setShowConfetti(true);

      // 3) Clear selected products (optional, up to your flow)
      setSelectedProducts({});

      // 4) Remove from localStorage
      const storedData = localStorage.getItem('slugBlandSelvMix');
      if (storedData) {
        const allData = JSON.parse(storedData);
        delete allData[slug as string];
        localStorage.setItem('slugBlandSelvMix', JSON.stringify(allData));
      }
    } catch (error: any) {
      console.error('Error adding to basket:', error);
      if (
        error.response &&
        error.response.data &&
        error.response.data.error === 'Invalid or expired selectionId'
      ) {
        // The selectionId is invalid or expired, retry creating a new one
        const newSelectionId = await createTemporarySelection();
        if (newSelectionId) {
          try {
            await addItemToBasket({ selectionId: newSelectionId, quantity: 1 });
            setShowConfetti(true);
          } catch (err) {
            console.error('Error adding to basket with new selectionId:', err);
            alert('Error adding to basket. Please try again.');
          }
        } else {
          alert('Failed to create a new selection. Please try again.');
        }
      } else {
        alert('Error adding to basket. Please try again.');
      }
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Close confetti
  const handleConfettiEnd = () => {
    setShowConfetti(false);
  };

  // ---------------
  // Render
  // ---------------
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

      <div className="flex flex-col md:flex-row items-center">
        {/* Left Column: Image and Description */}
        <div className="md:w-1/2">
          {product.image && (
            <img src={product.image} alt={product.title} className="w-full h-auto" />
          )}

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
            {product.packages && product.packages.length > 0 ? (
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
          <div className="mt-4">
            <p>Select drinks (exactly {maxProducts}):</p>
            {Object.keys(drinksData).map((drinkSlug, index) => {
              const currentQty = selectedProducts[drinkSlug] || 0;
              return (
                <div key={drinkSlug} className="flex items-center justify-between mt-2">
                  <a href={`/drinks/${drinkSlug}`} className="flex items-center">
                    <div className="w-12 aspect-[463/775] relative mr-4">
                      {drinksData[drinkSlug]?.image && (
                        <Image
                          src={drinksData[drinkSlug].image}
                          alt={drinksData[drinkSlug].name || drinkSlug}
                          layout="fill"
                          className="object-cover rounded-lg"
                        />
                      )}
                    </div>
                    <span>{drinksData[drinkSlug]?.name || drinkSlug}</span>
                  </a>
                  <div className="flex items-center">
                    <button
                      onClick={() => handleProductQuantityChange(drinkSlug, 'decrement')}
                      className="px-2 py-1 bg-gray-200 rounded-l"
                      disabled={currentQty === 0}
                    >
                      -
                    </button>
                    <span className="px-4 py-2 bg-gray-100">{currentQty}</span>
                    <button
                      onClick={() => handleProductQuantityChange(drinkSlug, 'increment')}
                      className="px-2 py-1 bg-gray-200 rounded-r"
                      disabled={getTotalSelected() >= maxProducts}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
            <p className="mt-2 text-red-600">
              You have selected {getTotalSelected()} out of {maxProducts} drinks.
            </p>
          </div>

          {/* Add to Basket Button */}
          <LoadingConfettiButton
            ref={addToCartButtonRef}
            onClick={addToBasket}
            loading={isAddingToCart}
            className="mt-6 bg-red-500 text-white px-6 py-2 rounded-full shadow hover:bg-red-600 transition w-full"
          >
            Add Mixed Package to Cart
          </LoadingConfettiButton>
        </div>
      </div>

      {/* Render Confetti */}
      {showConfetti && (
        <ConfettiAnimation onAnimationEnd={handleConfettiEnd} buttonRef={addToCartButtonRef} />
      )}
    </div>
  );
};

export default BlandSelvMixProduct;
