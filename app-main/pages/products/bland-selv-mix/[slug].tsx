// pages/products/bland-selv-mix/[slug].tsx

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Image from 'next/image';

import Loading from '../../../components/Loading';
import LoadingConfettiButton from '../../../components/LoadingConfettiButton';
import ConfettiAnimation from '../../../components/ConfettiAnimation';
import { useBasket } from '../../../components/BasketContext';

//
// Type Definitions
//
interface ProductPackage {
  size: number;
}

interface ProductType {
  title: string;
  image: string;
  description: string;
  packages?: ProductPackage[];      // from Supabase "package_sizes"
  collectionsDrinks?: string[];     // from joined drinks
}

interface DrinkData {
  name: string;
  image: string;
}

type DrinksDataType = Record<string, DrinkData>;
type SelectedProductsType = Record<string, number>;

//
// **Add this** to build absolute image URLs
//
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

const BlandSelvMixProduct: React.FC = () => {
  const router = useRouter();
  const slug = router.query.slug as string | undefined;

  const addToCartButtonRef = useRef<HTMLButtonElement | null>(null);

  const [product, setProduct] = useState<ProductType | null>(null);
  const [drinksData, setDrinksData] = useState<DrinksDataType>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProductsType>({});
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [maxProducts, setMaxProducts] = useState<number>(0);

  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  const { addItemToBasket } = useBasket();

  //
  // Local Storage
  //
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
        const { selectedSize: storedSize, selectedProducts: storedProds } = allSlugsData[slug];
        if (storedSize) setSelectedSize(storedSize);
        if (storedProds) setSelectedProducts(storedProds);
      }
    }
  }, [slug]);

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

  //
  // Fetch product + drinks
  //
  useEffect(() => {
    if (!slug) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1) Get the package info from Supabase
        const { data } = await axios.get(`/api/supabase/packages/${slug}`);
        const productData: ProductType = data.package;
        setProduct(productData);

        // 2) Default to first size if not chosen
        if (!selectedSize && productData.packages && productData.packages.length > 0) {
          setSelectedSize(productData.packages[0].size);
        }

        // 3) If package has "collectionsDrinks", fetch them
        if (productData.collectionsDrinks?.length) {
          const resp = await axios.post('/api/supabase/3-getDrinksBySlugs', {
            slugs: productData.collectionsDrinks,
          });
          setDrinksData(resp.data.drinks as DrinksDataType);
        }
      } catch (err) {
        console.error('[BlandSelvMix] Error fetching data:', err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [slug, selectedSize]);

  useEffect(() => {
    if (selectedSize) {
      setMaxProducts(selectedSize);
    }
  }, [selectedSize]);

  //
  // Handlers
  //
  const getTotalSelected = useCallback((): number => {
    return Object.values(selectedProducts).reduce((sum, qty) => sum + qty, 0);
  }, [selectedProducts]);

  const handleProductQuantityChange = (drinkSlug: string, action: 'increment' | 'decrement') => {
    setSelectedProducts((prev) => {
      const currentQty = prev[drinkSlug] || 0;
      let newQty = currentQty;

      if (action === 'increment' && getTotalSelected() < maxProducts) {
        newQty++;
      } else if (action === 'decrement' && currentQty > 0) {
        newQty--;
      }

      const updated = { ...prev, [drinkSlug]: newQty };
      if (updated[drinkSlug] === 0) {
        delete updated[drinkSlug];
      }
      return updated;
    });
  };

  // Create a custom selection
  const createTemporarySelection = async (): Promise<string | null> => {
    try {
      const resp = await axios.post('/api/supabase/4-generateRandomSelection', {
        slug,
        selectedSize,
        selectedProducts,
        isCustomSelection: true,
        sugarPreference: null,
      });
      if (resp.data.success) {
        return resp.data.selectionId as string;
      } else {
        console.error('[createTemporarySelection] Failed:', resp.data);
        alert('Failed to create selection. Please try again.');
        return null;
      }
    } catch (error) {
      console.error('[createTemporarySelection] Error:', error);
      alert('Error creating selection. Please try again.');
      return null;
    }
  };

  const addToBasket = async () => {
    if (getTotalSelected() !== maxProducts) {
      alert(`Please select exactly ${maxProducts} drinks.`);
      return;
    }
    setIsAddingToCart(true);
    try {
      // 1) Create the selection
      const selectionId = await createTemporarySelection();
      if (!selectionId) return;

      // 2) Add to basket
      await addItemToBasket({ selectionId, quantity: 1 });

      // 3) Confetti
      setShowConfetti(true);

      // 4) Clear picks
      setSelectedProducts({});

      // 5) Clear localStorage for this slug
      const storedData = localStorage.getItem('slugBlandSelvMix');
      if (storedData) {
        const allData = JSON.parse(storedData);
        delete allData[slug as string];
        localStorage.setItem('slugBlandSelvMix', JSON.stringify(allData));
      }
    } catch (error: any) {
      console.error('[addToBasket] Error:', error);

      if (
        error.response?.data?.error === 'Invalid or expired selectionId'
      ) {
        // Attempt creating new selection
        const newSelectionId = await createTemporarySelection();
        if (newSelectionId) {
          try {
            await addItemToBasket({ selectionId: newSelectionId, quantity: 1 });
            setShowConfetti(true);
          } catch (err) {
            console.error('[addToBasket] Retry error:', err);
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

  const handleConfettiEnd = () => setShowConfetti(false);

  //
  // Render
  //
  if (loading) {
    return <Loading />;
  }
  if (!product) {
    return <p>Product not found.</p>;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold text-center mb-8">
        {product.title}
      </h1>

      <div className="flex flex-col md:flex-row items-center">
        {/* Left: Product image + description */}
        <div className="md:w-1/2">
          {product.image && (
            <img
              // **Use the absolute URL**
              src={`${SUPABASE_URL}${product.image}`}
              alt={product.title}
              className="w-full h-auto"
            />
          )}

          <div className="mt-6">
            <h2 className="text-2xl font-bold mb-2">Description</h2>
            <p className="text-lg text-gray-700">{product.description}</p>
          </div>
        </div>

        {/* Right: Selections */}
        <div className="md:w-1/2 md:pl-8">
          {/* Package Size */}
          <div className="mt-4">
            <p>Select Package Size:</p>
            {product.packages?.length ? (
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

          {/* Drinks selection */}
          <div className="mt-4">
            <p>Select drinks (exactly {maxProducts}):</p>
            {Object.keys(drinksData).map((drinkSlug) => {
              const currentQty = selectedProducts[drinkSlug] || 0;
              const drink = drinksData[drinkSlug];

              return (
                <div
                  key={drinkSlug}
                  className="flex items-center justify-between mt-2"
                >
                  <div className="flex items-center">
                    <div className="w-12 aspect-[463/775] relative mr-4">
                      {drink?.image && (
                        <Image
                          // **Again, prepend SUPABASE_URL**
                          src={`${SUPABASE_URL}${drink.image}`}
                          alt={drink.name || drinkSlug}
                          fill
                          className="object-cover rounded-lg"
                        />
                      )}
                    </div>
                    <span>{drink?.name || drinkSlug}</span>
                  </div>

                  <div className="flex items-center">
                    <button
                      onClick={() => handleProductQuantityChange(drinkSlug, 'decrement')}
                      className="px-2 py-1 bg-gray-200 rounded-l"
                      disabled={currentQty === 0}
                    >
                      -
                    </button>
                    <span className="px-4 py-2 bg-gray-100">
                      {currentQty}
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

      {/* Confetti */}
      {showConfetti && (
        <ConfettiAnimation
          onAnimationEnd={handleConfettiEnd}
          buttonRef={addToCartButtonRef}
        />
      )}
    </div>
  );
};

export default BlandSelvMixProduct;
