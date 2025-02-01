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

import { useBasket } from '../../../components/BasketContext';
import Loading from '../../../components/Loading';
import LoadingButton from '../../../components/LoadingButton';
import LoadingConfettiButton from '../../../components/LoadingConfettiButton';
import ConfettiAnimation from '../../../components/ConfettiAnimation';

import { getCookie } from '../../../lib/cookies';

interface ProductPackage {
  size: number;
  discount?: number;
  roundUpOrDown?: number;
}

interface ProductType {
  slug: string;
  title: string;
  image: string;
  description: string;
  category: string;
  packages?: ProductPackage[];       // from Supabase "package_sizes"
  collectionsDrinks?: string[];      // from joined drinks
}

type DrinksDataType = Record<
  string,
  {
    name: string;
    image: string;
    // ... any other fields you use
  }
>;

// For the random selection
type RandomSelectionType = Record<string, number>;

interface SelectionInfo {
  selectedProducts: RandomSelectionType;
  selectionId: string;
}

type SelectionsType = Record<string, SelectionInfo>;

const ViBlanderForDigProduct: React.FC = () => {
  const router = useRouter();
  const slug = router.query.slug as string;

  const { addItemToBasket } = useBasket();

  const [sessionId, setSessionId] = useState<string | null>(null);
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

  const addToCartButtonRef = useRef<HTMLButtonElement | null>(null);

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Read the session_id cookie on mount
  useEffect(() => {
    const sid = getCookie('session_id');
    console.debug('[useEffect] Reading cookie session_id:', sid);
    if (sid) setSessionId(sid);
  }, []);

  // Load local selections from localStorage
  useEffect(() => {
    if (!slug) return;
    console.debug('[useEffect] Slug changed to:', slug);

    const storedData = localStorage.getItem('slugViBlander');
    if (storedData) {
      const allSelections = JSON.parse(storedData) as Record<string, SelectionsType>;
      if (allSelections[slug]) {
        console.debug('[useEffect] Found existing localStorage for slug:', slug, allSelections[slug]);
        setSelections(allSelections[slug]);
      } else {
        console.debug('[useEffect] No existing localStorage selections for this slug:', slug);
      }
    } else {
      console.debug('[useEffect] localStorage key "slugViBlander" is empty');
    }
  }, [slug]);

  // Fetch product + drinks data
  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    const fetchData = async () => {
      try {
        console.debug('[fetchData] Start. Slug =', slug);

        // 1) Get the package info
        const { data } = await axios.get(`/api/supabase/packages/${slug}`);
        console.debug('[fetchData] /packages/ response data:', data);

        const productData: ProductType = data.package;
        setProduct(productData);
        console.debug('[fetchData] Product data set:', productData);

        // Select a default package size if present
        if (productData?.packages?.length) {
          setSelectedSize(productData.packages[0].size);
          console.debug('[fetchData] Setting default selectedSize to:', productData.packages[0].size);
        }

        // 2) If we have a collectionsDrinks array, fetch full drink details
        if (productData?.collectionsDrinks?.length) {
          console.debug('[fetchData] Going to fetch drinks by slugs:', productData.collectionsDrinks);
          const resp = await axios.post('/api/supabase/3-getDrinksBySlugs', {
            slugs: productData.collectionsDrinks,
          });
          console.debug('[fetchData] 3-getDrinksBySlugs response:', resp.data);
          setDrinksData(resp.data.drinks);
        } else {
          console.debug('[fetchData] No collectionsDrinks on product');
        }
      } catch (err) {
        console.error('[fetchData] Error fetching product/drinks:', err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [slug]);

  // On changes to selectedSize / sugarPreference
  useEffect(() => {
    console.debug('[useEffect - selection change] selectedSize=', selectedSize, 'sugarPreference=', sugarPreference);
    if (!product || selectedSize == null) return;

    const key = getSelectionKey();
    console.debug('[useEffect - selection change] Selection key:', key);

    if (selections[key]) {
      console.debug('[useEffect - selection change] Found existing selection in state:', selections[key]);
      const { selectedProducts, selectionId } = selections[key];
      setRandomSelection(selectedProducts);
      setSelectionId(selectionId);

      // fetch price
      void fetchPrice(selectedProducts);
    } else {
      console.debug('[useEffect - selection change] No existing selection; generating new random package...');
      void generateRandomPackage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, selectedSize, sugarPreference]);

  const getSelectionKey = useCallback(() => {
    return `${selectedSize}_${sugarPreference}`;
  }, [selectedSize, sugarPreference]);

  // Generate random package
  const generateRandomPackage = async () => {
    if (!sessionId) {
      alert('No session ID found. Please ensure your cookies are set.');
      return;
    }
    if (!selectedSize) {
      alert('Please select a size first.');
      return;
    }
    setIsGenerating(true);

    try {
      console.debug('[generateRandomPackage] Posting to /4-generateRandomSelection with:', {
        sessionId,
        slug,
        selectedSize,
        sugarPreference,
      });
      const response = await axios.post('/api/supabase/4-generateRandomSelection', {
        sessionId,
        slug,
        selectedSize,
        sugarPreference,
      });

      console.debug('[generateRandomPackage] Response:', response.data);

      if (response.data.success) {
        const { selectedProducts, selectionId } = response.data;
        setRandomSelection(selectedProducts);
        setSelectionId(selectionId);

        console.debug('[generateRandomPackage] Setting randomSelection in state to:', selectedProducts);

        // Save to local state
        const key = getSelectionKey();
        const newSelections: SelectionsType = {
          ...selections,
          [key]: { selectedProducts, selectionId },
        };
        setSelections(newSelections);

        // Store in localStorage
        const stored = localStorage.getItem('slugViBlander');
        const all = stored ? JSON.parse(stored) : {};
        all[slug] = newSelections;
        localStorage.setItem('slugViBlander', JSON.stringify(all));

        // fetch price
        await fetchPrice(selectedProducts);
      } else {
        alert(`Error generating random package: ${response.data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('[generateRandomPackage] Error:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate price for the selected random drinks
  const fetchPrice = async (selection: RandomSelectionType) => {
    console.debug('[fetchPrice] selection =', selection);
    if (!selectedSize) return;
    try {
      const payload = {
        selectedSize,
        slug,
        selectedProducts: selection,
      };
      console.debug('[fetchPrice] Requesting /3-getCalculatedPackagePrice with payload:', payload);

      // EXACT PATH to match your file name:
      const { data } = await axios.post('/api/supabase/3-getCalculatedPackagePrice', payload);
      console.debug('[fetchPrice] Response data:', data);

      if (data?.price) {
        setPrice(data.price);
        setOriginalPrice(data.originalPrice || data.price);
        console.debug('[fetchPrice] Price set:', data.price, 'Original:', data.originalPrice);
      }
    } catch (err) {
      console.error('[fetchPrice] Error:', err);
      // alert(err.response?.data?.error || err.message);
    }
  };

  // Add item to basket
  const addToBasket = async () => {
    if (!selectionId) {
      alert('No random selection ID found—please generate a package first.');
      return;
    }
    setIsAddingToCart(true);

    try {
      console.debug('[addToBasket] Adding item to basket with selectionId:', selectionId, 'quantity:', quantity);
      await addItemToBasket({
        selectionId,
        quantity: Number(quantity),
      });
      console.debug('[addToBasket] Success! Trigger confetti now.');
      setShowConfetti(true);
    } catch (error: any) {
      console.error('[addToBasket] Error:', error);
      alert('Error adding to basket. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Confetti
  const handleConfettiEnd = () => setShowConfetti(false);

  // Render loading or error
  if (loading) {
    return <Loading />;
  }
  if (!product) {
    return <p>Product not found.</p>;
  }

  console.debug('[RENDER] randomSelection in the JSX =', randomSelection);
  console.debug('[RENDER] drinksData in the JSX =', drinksData);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold text-center mb-8">
        {product.title}
      </h1>

      <div className="flex flex-col md:flex-row">
        {/* Left column: image + desc */}
        <div className="md:w-1/2 flex-1">
          {product.image && (
            <img
              src={`${SUPABASE_URL}/${product.image}`}
              alt={product.title}
              className="w-full h-auto"
            />
          )}

          <div className="mt-6">
            <h2 className="text-2xl font-bold mb-2">Description</h2>
            <p className="text-lg text-gray-700">{product.description}</p>
          </div>
        </div>

        {/* Right column: random package + actions */}
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
                Uden sukker
              </label>
              <label className="mr-4">
                <input
                  type="radio"
                  name="sugarPreference"
                  value="med_sukker"
                  checked={sugarPreference === 'med_sukker'}
                  onChange={() => setSugarPreference('med_sukker')}
                />
                Med sukker
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

            {/* Random selection list */}
            <div className="mt-4 pr-4 border border-gray-300 rounded">
              <h2 className="text-xl font-bold text-center mt-4">
                Your Random {product.title}
              </h2>
              <ul className="list-disc list-inside mt-4 px-4">
                {Object.entries(randomSelection).map(([drinkSlug, qty]) => {
                  const drinkName = drinksData[drinkSlug]?.name || drinkSlug;
                  const drinkImage = drinksData[drinkSlug]?.image || '';
                  return (
                    <li key={drinkSlug} className="flex items-center mb-2">
                      <Link href={`/drinks/${drinkSlug}`} className="flex items-center">
                        <div className="w-12 aspect-[463/775] relative mr-4">
                          {drinkImage && (
                            <Image
                              // src={drinkImage}
                              src={`${SUPABASE_URL}${drinkImage}`}
                              alt={drinkName}
                              fill
                              className="object-cover rounded-lg"
                            />
                          )}
                        </div>
                        <span>
                          {drinkName} (x{qty})
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Action buttons + price */}
          <div className="mt-8">
            <LoadingButton
              onClick={generateRandomPackage}
              loading={isGenerating}
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-full shadow hover:bg-blue-600 transition w-full"
            >
              Generate New Package
            </LoadingButton>

            <LoadingConfettiButton
              ref={addToCartButtonRef}
              onClick={addToBasket}
              loading={isAddingToCart}
              className="mt-4 bg-red-500 text-white px-6 py-2 rounded-full shadow hover:bg-red-600 transition w-full"
            >
              Add to Cart
            </LoadingConfettiButton>

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
