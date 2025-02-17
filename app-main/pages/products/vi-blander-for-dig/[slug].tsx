// pages/products/vi-blander-for-dig/[slug].tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
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

type DrinksDataType = Record<string, {
  name: string;
  image: string;
}>;

type RandomSelectionType = Record<string, number>;

interface SelectionInfo {
  selectedProducts: RandomSelectionType;
  selectionId: string;
}

/**
 * We'll store multiple 'selection' objects for each slug in localStorage.
 * Something like localStorage["slugViBlander"] = {
 *   "mixed-monsters": {
 *     "8_alle": { selectionId: "...", selectedProducts: {...} },
 *     "8_uden_sukker": {...},
 *   },
 *   "mixed-boosters": {
 *     ...
 *   }
 * }
 */
type SelectionsType = Record<string, SelectionInfo>;

const ViBlanderForDigProduct: React.FC = () => {
  const router = useRouter();
  const slug = router.query.slug as string; // dynamic route

  const { addItemToBasket } = useBasket();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductType | null>(null);
  const [drinksData, setDrinksData] = useState<DrinksDataType>({});
  const [loading, setLoading] = useState<boolean>(true);

  // For the random selection in memory:
  const [selections, setSelections] = useState<SelectionsType>({});
  const [randomSelection, setRandomSelection] = useState<RandomSelectionType>({});
  const [selectionId, setSelectionId] = useState<string | null>(null);

  const [price, setPrice] = useState<number>(0);
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [sugarPreference, setSugarPreference] = useState<'alle' | 'med_sukker' | 'uden_sukker'>('alle');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  const addToCartButtonRef = useRef<HTMLButtonElement | null>(null);

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  // 1) Load session ID from cookie
  useEffect(() => {
    try {
      const sid = getCookie('session_id');
      console.debug('[useEffect] Cookie session_id =', sid);
      if (sid) setSessionId(sid);
    } catch (err) {
      console.error('[useEffect - session_id] Error reading cookie:', err);
    }
  }, []);

  // 2) Whenever slug changes, load localStorage
  useEffect(() => {
    if (!slug) {
      console.debug('[useEffect - slug change] No slug yet. Returning.');
      return;
    }

    console.debug(`[useEffect - slug change] slug="${slug}". Attempting to load from localStorage "slugViBlander".`);
    try {
      const stored = localStorage.getItem('slugViBlander');
      if (!stored) {
        console.debug('[useEffect - slug change] No localStorage key "slugViBlander" found. Nothing loaded.');
        return;
      }
      const allSlugsData = JSON.parse(stored) as Record<string, SelectionsType>;
      if (allSlugsData[slug]) {
        console.debug(`[useEffect - slug change] Found data for slug="${slug}":`, allSlugsData[slug]);
        setSelections(allSlugsData[slug]);
      } else {
        console.debug(`[useEffect - slug change] No data found for slug="${slug}" in localStorage object. Only have:`, allSlugsData);
      }
    } catch (err) {
      console.error('[useEffect - slug change] Error parsing localStorage:', err);
    }
  }, [slug]);

  // 3) Fetch product + drinks
  useEffect(() => {
    if (!slug) return;
    console.debug('[fetchData] Starting fetch for slug=', slug);
    setLoading(true);

    const fetchData = async () => {
      try {
        // 1) GET the package
        console.debug('[fetchData] GET /api/supabase/packages/', slug);
        const { data } = await axios.get(`/api/supabase/packages/${slug}`);
        console.debug('[fetchData] packages/:slug => data=', data);

        if (!data?.package) {
          console.debug('[fetchData] No "package" key found in response. Setting product to null.');
          setProduct(null);
          return;
        }

        const pkg: ProductType = data.package;
        setProduct(pkg);
        console.debug('[fetchData] Product set:', pkg);

        // 2) If packageSizes exist, set default size
        if (pkg.packages && pkg.packages.length > 0) {
          console.debug('[fetchData] Setting selectedSize to first packageSize =', pkg.packages[0].size);
          setSelectedSize(pkg.packages[0].size);
        }

        // 3) If we have collectionsDrinks, fetch them
        if (pkg.collectionsDrinks && pkg.collectionsDrinks.length > 0) {
          console.debug('[fetchData] POST /api/supabase/3-getDrinksBySlugs with slugs=', pkg.collectionsDrinks);
          const resp = await axios.post('/api/supabase/3-getDrinksBySlugs', {
            slugs: pkg.collectionsDrinks,
          });
          console.debug('[fetchData] 3-getDrinksBySlugs =>', resp.data);

          if (resp.data?.drinks) {
            setDrinksData(resp.data.drinks);
          } else {
            console.debug('[fetchData] resp.data.drinks is empty or undefined. Setting drinksData = {}');
            setDrinksData({});
          }
        } else {
          console.debug('[fetchData] No collectionsDrinks found. Setting drinksData = {}');
          setDrinksData({});
        }
      } catch (err) {
        console.error('[fetchData] Caught error:', err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [slug]);

  // 4) If selectedSize or sugarPreference changes => check if we have a selection in memory
  useEffect(() => {
    console.debug('[useEffect - selection change] product=', product, ' selectedSize=', selectedSize, ' sugarPref=', sugarPreference);
    if (!product || !selectedSize) {
      console.debug('[useEffect - selection change] No product or selectedSize yet. Stopping.');
      return;
    }

    const key = getSelectionKey();
    console.debug('[useEffect - selection change] key=', key, ' selections=', selections);

    if (selections[key]) {
      console.debug('[useEffect - selection change] Found existing selection in memory =>', selections[key]);
      setRandomSelection(selections[key].selectedProducts);
      setSelectionId(selections[key].selectionId);

      console.debug('[useEffect - selection change] Now calling fetchPrice() with the existing random selection...');
      void fetchPrice(selections[key].selectedProducts);
    } else {
      console.debug('[useEffect - selection change] No selection found. Will call generateRandomPackage...');
      void generateRandomPackage();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, selectedSize, sugarPreference]);

  // Helper to create a key "8_alle" or "12_uden_sukker"
  const getSelectionKey = useCallback(() => {
    return `${selectedSize}_${sugarPreference}`;
  }, [selectedSize, sugarPreference]);

  // Generate random package from server
  const generateRandomPackage = async () => {
    if (!sessionId) {
      console.error('[generateRandomPackage] No sessionId. Check cookie or session logic.');
      alert('No session ID found. Please ensure your cookies are set.');
      return;
    }
    if (!selectedSize) {
      alert('Please select a size first.');
      return;
    }
    setIsGenerating(true);

    try {
      const body = {
        sessionId,
        slug,
        selectedSize,
        sugarPreference,
      };
      console.debug('[generateRandomPackage] POST /api/supabase/4-generateRandomSelection =>', body);

      const resp = await axios.post('/api/supabase/4-generateRandomSelection', body);
      console.debug('[generateRandomPackage] Response data =>', resp.data);

      if (resp.data.success) {
        const { selectedProducts, selectionId } = resp.data;
        console.debug('[generateRandomPackage] Storing new random selection =>', selectedProducts, ' selectionId=', selectionId);

        setRandomSelection(selectedProducts);
        setSelectionId(selectionId);

        // Update in-memory
        const key = getSelectionKey();
        const newSelectionInfo: SelectionInfo = { selectedProducts, selectionId };
        const updatedSelections = { ...selections, [key]: newSelectionInfo };
        setSelections(updatedSelections);

        // Also update localStorage
        console.debug('[generateRandomPackage] Updating localStorage for slugViBlander => slug=', slug, ' key=', key);
        const stored = localStorage.getItem('slugViBlander');
        let allSlugsData: Record<string, SelectionsType> = {};
        if (stored) {
          try {
            allSlugsData = JSON.parse(stored);
          } catch (parseErr) {
            console.error('[generateRandomPackage] parse localStorage error:', parseErr);
          }
        }
        allSlugsData[slug] = updatedSelections;
        localStorage.setItem('slugViBlander', JSON.stringify(allSlugsData));

        // fetch price
        console.debug('[generateRandomPackage] Now calling fetchPrice with new random selection...');
        await fetchPrice(selectedProducts);
      } else {
        console.error('[generateRandomPackage] The API returned success=false =>', resp.data.error);
        alert(`Error generating random package: ${resp.data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('[generateRandomPackage] Caught error =>', err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // fetchPrice => calls your /3-getCalculatedPackagePrice
  const fetchPrice = async (selectedProducts: RandomSelectionType) => {
    if (!selectedSize) {
      console.debug('[fetchPrice] No selectedSize. Return.');
      return;
    }
    try {
      const payload = {
        selectedSize,
        slug,
        selectedProducts,
      };
      console.debug('[fetchPrice] POST /api/supabase/3-getCalculatedPackagePrice =>', payload);

      const resp = await axios.post('/api/supabase/3-getCalculatedPackagePrice', payload);
      console.debug('[fetchPrice] Response =>', resp.data);

      if (resp.data?.price) {
        setPrice(resp.data.price);
        setOriginalPrice(resp.data.originalPrice ?? resp.data.price);
        console.debug('[fetchPrice] Setting price to:', resp.data.price, ' originalPrice=', resp.data.originalPrice);
      } else {
        console.debug('[fetchPrice] No "price" field in response =>', resp.data);
      }
    } catch (err) {
      console.error('[fetchPrice] Error =>', err);
    }
  };

  // addToBasket => calls addItemToBasket from context
  const addToBasketAction = async () => {
    if (!selectionId) {
      console.error('[addToBasket] No selectionId in state => randomSelection was never created?');
      alert('No random selection ID found—please generate a package first.');
      return;
    }
    setIsAddingToCart(true);

    try {
      console.debug('[addToBasket] Attempting addItemToBasket => selectionId=', selectionId, ' quantity=', quantity);
      await addItemToBasket({
        selectionId,
        quantity: Number(quantity),
      });
      console.debug('[addToBasket] Successfully added => showing confetti.');
      setShowConfetti(true);
    } catch (err) {
      console.error('[addToBasket] Caught error =>', err);
      alert('Error adding to basket. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleConfettiEnd = () => {
    setShowConfetti(false);
  };

  // Render
  if (loading) {
    console.debug('[RENDER] loading=true => <Loading/>');
    return <Loading />;
  }
  if (!product) {
    console.debug('[RENDER] product=null => "Product not found."');
    return <p>Product not found.</p>;
  }

  console.debug('[RENDER] Final randomSelection =>', randomSelection);
  console.debug('[RENDER] drinksData =>', drinksData);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold text-center mb-8">{product.title}</h1>

      <div className="flex flex-col md:flex-row">
        {/* Left: image + desc */}
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

        {/* Right: selection + actions */}
        <div className="md:w-1/2 md:pl-8 flex-1 flex flex-col justify-between">
          <div>
            {/* Select package size */}
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

          {/* Price + Buttons */}
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
              onClick={addToBasketAction}
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
