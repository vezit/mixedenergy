import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Image from 'next/image';
import Link from 'next/link';

// Suppose you have this or a similar hook
import { useBasket } from '../../../components/BasketContext';

// Custom components
import Loading from '../../../components/Loading';
import LoadingButton from '../../../components/LoadingButton';
import LoadingConfettiButton from '../../../components/LoadingConfettiButton';
import ConfettiAnimation from '../../../components/ConfettiAnimation';

// If you have a custom getCookie helper
import { getCookie } from '../../../lib/cookies';

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

type DrinksDataType = Record<
  string,
  {
    name: string;
    image: string;
  }
>;

// For the random selection, e.g. { 'coca-cola-zero': 2, 'pepsi-max': 3 }
type RandomSelectionType = Record<string, number>;

interface SelectionInfo {
  selectedProducts: RandomSelectionType;
  selectionId: string;
}

type SelectionsType = Record<string, SelectionInfo>;

// ------------------
// Component
// ------------------

const ViBlanderForDigProduct: React.FC = () => {
  const router = useRouter();
  const slug = router.query.slug as string; // Ensure slug is typed as string

  // Read basket context
  const { addItemToBasket } = useBasket();

  // State for storing the sessionId from cookies
  const [sessionId, setSessionId] = useState<string | null>(null);

  // States for the product, drinks, selections, etc.
  const [product, setProduct] = useState<ProductType | null>(null);
  const [drinksData, setDrinksData] = useState<DrinksDataType>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [selections, setSelections] = useState<SelectionsType>({});
  const [randomSelection, setRandomSelection] = useState<RandomSelectionType>({});
  const [selectionId, setSelectionId] = useState<string | null>(null);

  const [price, setPrice] = useState<number>(0);
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [sugarPreference, setSugarPreference] = useState<string>('alle');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  // For referencing the "Add to Cart" button in our confetti animation
  const addToCartButtonRef = useRef<HTMLButtonElement | null>(null);

  // On mount, try reading the 'session_id' from client cookies (if NOT HTTP-only)
  useEffect(() => {
    const localSessionId = getCookie('session_id');
    if (localSessionId) {
      setSessionId(localSessionId);
    } else {
      console.warn('No session_id cookie found (maybe it is HTTP-only?).');
    }
  }, []);

  // Utility: create a unique key for the current size + sugar preference
  const getSelectionKey = useCallback((): string => {
    return `${selectedSize}_${sugarPreference}`;
  }, [selectedSize, sugarPreference]);

  // Load selections from localStorage on mount (only if slug is known)
  useEffect(() => {
    if (!slug) return;
    const storedData = localStorage.getItem('slugViBlander');
    if (storedData) {
      const allSelections = JSON.parse(storedData) as Record<string, SelectionsType>;
      if (allSelections[slug]) {
        setSelections(allSelections[slug]);
      }
    }
  }, [slug]);

  // Fetch product + drinks data
  useEffect(() => {
    if (!slug) return;

    const fetchProductAndDrinks = async () => {
      setLoading(true);
      try {
        // 1) Fetch the product
        const productResponse = await axios.get(`/api/supabase/packages/${slug}`);
        const productData = productResponse.data.package as ProductType;
        setProduct(productData);

        // Set a default selected size
        if (productData?.packages && productData.packages.length > 0) {
          setSelectedSize(productData.packages[0].size);
        }

        // 2) If package has "collectionsDrinks", fetch them
        if (productData?.collectionsDrinks?.length) {
          const drinksResponse = await axios.post('/api/supabase/3-getDrinksBySlugs', {
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
  }, [slug]);

  // On changes to selectedSize / sugarPreference: either load existing selection or generate new
  useEffect(() => {
    if (!product || selectedSize === null) return;

    const selectionKey = getSelectionKey();

    // If we already have a saved random selection for these options, use it
    if (selections[selectionKey]) {
      const { selectedProducts, selectionId } = selections[selectionKey];
      setRandomSelection(selectedProducts);
      setSelectionId(selectionId);
      void fetchPrice(selectedProducts);
    } else {
      // otherwise, generate new
      void generateRandomPackage();
    }
  }, [product, selectedSize, sugarPreference, getSelectionKey, selections]);

  // Handler: generate a new random package
  const generateRandomPackage = async () => {
    if (!sessionId) {
      alert('No sessionId found (maybe the cookie is HTTP-only?).');
      return;
    }
    if (!selectedSize) {
      alert('Please select a size first.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await axios.post('/api/supabase/4-generateRandomSelection', {
        sessionId,         // <--- pass the sessionId here
        slug,
        selectedSize,
        sugarPreference,
      });

      if (response.data.success) {
        const { selectedProducts, selectionId } = response.data;
        setRandomSelection(selectedProducts);
        setSelectionId(selectionId);

        // Store in our state
        const selectionKey = getSelectionKey();
        const newSelections: SelectionsType = {
          ...selections,
          [selectionKey]: { selectedProducts, selectionId },
        };
        setSelections(newSelections);

        // Save to localStorage
        const storedData = localStorage.getItem('slugViBlander');
        const allSelections = storedData ? JSON.parse(storedData) : {};
        allSelections[slug] = newSelections;
        localStorage.setItem('slugViBlander', JSON.stringify(allSelections));

        // Fetch price
        await fetchPrice(selectedProducts);
      } else {
        console.error('Failed to generate random package:', response.data);
        alert('Error: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Error generating package:', error);
      alert('Error generating package: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler: fetch the calculated price
  const fetchPrice = async (selection: RandomSelectionType) => {
    try {
      const payload = {
        selectedSize,
        slug,
        selectedProducts: selection,
      };
      const response = await axios.post('/api/supabase/3-getCalculatedPackagePrice', payload);
      if (response.data.price) {
        setPrice(response.data.price);
        setOriginalPrice(response.data.originalPrice);
      } else {
        console.error('Price not returned from API:', response.data);
      }
    } catch (error) {
      console.error('Error fetching price:', error);
    }
  };

  // Handler: add the generated package to the basket
  const addToBasket = async () => {
    if (!selectionId) {
      alert('Please generate a package first.');
      return;
    }
    setIsAddingToCart(true);
    try {
      // Example: your basket logic
      const mixedProduct = {
        selectionId,
        quantity: Number(quantity),
      };
      await addItemToBasket(mixedProduct);
      setShowConfetti(true); // triggers confetti
    } catch (error: any) {
      console.error('Error adding to basket:', error);
      alert('Error adding to basket. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Confetti end
  const handleConfettiEnd = () => {
    setShowConfetti(false);
  };

  // If loading initial data
  if (loading) {
    return <Loading />;
  }

  // If product not found
  if (!product) {
    return <p>Product not found.</p>;
  }

  // Render
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold text-center mb-8">{product.title}</h1>

      <div className="flex flex-col md:flex-row">
        {/* Left column: image + desc */}
        <div className="md:w-1/2 flex-1">
          {product.image && (
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-auto"
            />
          )}

          <div className="mt-6">
            <h2 className="text-2xl font-bold mb-2">Description</h2>
            <p className="text-lg text-gray-700">{product.description}</p>
          </div>
        </div>

        {/* Right column: random package and actions */}
        <div className="md:w-1/2 md:pl-8 flex flex-col justify-between flex-1">
          <div>
            {/* Package sizes */}
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

            {/* Sugar preference */}
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
                Alle
              </label>
            </div>

            {/* Display random selection */}
            <div className="mt-4 pr-4 border border-gray-300 rounded">
              <h2 className="text-xl font-bold text-center mt-4">
                {`Your Random ${product.title}`}
              </h2>
              <ul className="list-disc list-inside mt-4 px-4">
                {Object.entries(randomSelection).map(([drinkSlug, qty]) => (
                  <li key={drinkSlug} className="flex items-center mb-2">
                    <Link href={`/drinks/${drinkSlug}`} className="flex items-center">
                      <div className="w-12 aspect-[463/775] relative mr-4">
                        {drinksData[drinkSlug]?.image && (
                          <Image
                            src={drinksData[drinkSlug].image}
                            alt={drinksData[drinkSlug]?.name || drinkSlug}
                            fill
                            className="object-cover rounded-lg"
                          />
                        )}
                      </div>
                      <span>
                        {drinksData[drinkSlug]?.name || drinkSlug} (x{qty})
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8">
            {/* Generate button */}
            <LoadingButton
              onClick={generateRandomPackage}
              loading={isGenerating}
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-full shadow hover:bg-blue-600 transition w-full"
            >
              Generate New Package
            </LoadingButton>

            {/* Add to Cart */}
            <LoadingConfettiButton
              ref={addToCartButtonRef}
              onClick={addToBasket}
              loading={isAddingToCart}
              className="mt-4 bg-red-500 text-white px-6 py-2 rounded-full shadow hover:bg-red-600 transition w-full"
            >
              Add to Cart
            </LoadingConfettiButton>

            {/* Price Display */}
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

export default ViBlanderForDigProduct;
