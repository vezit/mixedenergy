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

/**
 * Types for product & drinks
 */
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
  packages?: ProductPackage[]; // from "package_sizes"
  collectionsDrinks?: string[]; // from joined drinks
}

type DrinksDataType = Record<
  string,
  {
    name: string;
    image: string;
  }
>;

type RandomSelectionType = Record<string, number>;

interface TemporarySelections {
  [key: string]: {
    selectedProducts: RandomSelectionType;
    selectedSize: number;
    packageSlug: string;
    sugarPreference?: string;
    isMysteryBox?: boolean;
    createdAt: string;
  };
}

/**
 * The main component for '/vi-blander-for-dig/[slug]'
 */
const ViBlanderForDigProduct: React.FC = () => {
  const router = useRouter();
  const slug = router.query.slug as string;

  const { addItemToBasket } = useBasket();

  // Basic UI states
  const [loading, setLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  // The session_id read from cookie
  const [sessionId, setSessionId] = useState<string | null>(null);

  // The fetched product
  const [product, setProduct] = useState<ProductType | null>(null);

  // For showing user’s random selection
  const [randomSelection, setRandomSelection] = useState<RandomSelectionType>({});
  const [selectionId, setSelectionId] = useState<string | null>(null);

  // Pricing
  const [price, setPrice] = useState<number>(0);
  const [originalPrice, setOriginalPrice] = useState<number>(0);

  // User choices
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [sugarPreference, setSugarPreference] = useState<'alle' | 'med_sukker' | 'uden_sukker'>(
    'alle'
  );

  // For displaying drink data (images, names)
  const [drinksData, setDrinksData] = useState<DrinksDataType>({});

  // For the confetti effect
  const addToCartButtonRef = useRef<HTMLButtonElement | null>(null);

  // If you need to build a Supabase image URL, use this
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  /**
   * 1) Read the session_id cookie on mount
   */
  useEffect(() => {
    try {
      const sid = getCookie('session_id');
      if (sid) {
        console.debug('[ViBlanderForDigProduct] session_id cookie =', sid);
        setSessionId(sid);
      } else {
        console.warn('No session_id cookie found.');
      }
    } catch (err) {
      console.error('Error reading cookie:', err);
    }
  }, []);

  /**
   * 2) Fetch product details from /api/supabase/packages/[slug]
   */
  useEffect(() => {
    if (!slug) return;
    console.debug('[ViBlanderForDigProduct] Slug changed =>', slug);
    setLoading(true);

    (async () => {
      try {
        const { data } = await axios.get(`/api/supabase/packages/${slug}`);
        if (!data?.package) {
          console.warn('No "package" found for slug=', slug);
          setProduct(null);
          return;
        }

        const pkg: ProductType = data.package;
        setProduct(pkg);

        // If we have package sizes, default to the first
        if (pkg.packages && pkg.packages.length > 0) {
          setSelectedSize(pkg.packages[0].size);
        }

        // If product has 'collectionsDrinks', fetch their data
        if (pkg.collectionsDrinks && pkg.collectionsDrinks.length > 0) {
          const resp = await axios.post('/api/supabase/3-getDrinksBySlugs', {
            slugs: pkg.collectionsDrinks,
          });
          setDrinksData(resp.data?.drinks || {});
        } else {
          setDrinksData({});
        }
      } catch (err) {
        console.error('[fetchProduct] Error =>', err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  /**
   * 3) Whenever selectedSize or sugarPreference changes => check if there's already a
   *    temporary selection for "<slug>-<selectedSize>-<sugarPreference>" in DB.
   *    If not found => create a new selection (with isMysteryBox = true).
   */
  useEffect(() => {
    if (!sessionId || !product || !selectedSize) {
      console.debug('[checkExistingSelection] Missing sessionId/product/selectedSize => skipping');
      return;
    }
    const selectionKey = getSelectionKey();

    (async () => {
      setLoading(true);
      try {
        // 1) Fetch the current session from server
        const resp = await axios.get('/api/supabase/session');
        const currentSession = resp.data?.session;
        if (!currentSession?.temporary_selections) {
          // No existing selections => create new
          console.debug('[checkExistingSelection] No temporary_selections => create new');
          await createSelectionInSupabase(true);
          return;
        }

        // 2) See if selectionKey is in session.temporary_selections
        const temp = currentSession.temporary_selections as TemporarySelections;
        if (temp[selectionKey]) {
          console.debug('[checkExistingSelection] Found existing =>', selectionKey);
          const existing = temp[selectionKey];
          setRandomSelection(existing.selectedProducts);
          setSelectionId(selectionKey);

          // fetch price
          await fetchPrice(existing.selectedProducts);
        } else {
          console.debug('[checkExistingSelection] Not found => create new');
          await createSelectionInSupabase(true);
        }
      } catch (err) {
        console.error('Error checking existing selection =>', err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, product, selectedSize, sugarPreference]);

  /**
   * A unique key: "<slug>-<selectedSize>-<sugarPreference>"
   */
  const getSelectionKey = useCallback(() => {
    const pref = sugarPreference || 'alle';
    return `${slug}-${selectedSize}-${pref}`;
  }, [slug, selectedSize, sugarPreference]);

  /**
   * createSelectionInSupabase
   *   Calls your single route with action="createTemporarySelection"
   *   and { isMysteryBox: true } so the server picks random drinks
   *   or merges a custom selection if you prefer.
   */
  async function createSelectionInSupabase(isMysteryBox: boolean) {
    if (!sessionId || !slug || !selectedSize) return;

    setIsGenerating(true);
    try {
      const body = {
        sessionId,
        packageSlug: slug,
        selectedSize,
        sugarPreference,
        isMysteryBox,
        // If you want to pass a custom "selectedProducts", you can do so
        // selectedProducts: {...} 
      };
      console.debug('[createSelectionInSupabase] =>', body);

      const resp = await axios.post('/api/supabase/session', {
        action: 'createTemporarySelection',
        ...body,
      });

      if (!resp.data?.success) {
        console.error('createTemporarySelection => success=false', resp.data.error);
        alert(resp.data.error || 'Error creating temporary selection');
        return;
      }

      // e.g. { selectionId, pricePerPackage, recyclingFeePerPackage }
      const { selectionId, pricePerPackage } = resp.data;
      console.debug('Created new selection =>', selectionId);

      setSelectionId(selectionId);

      // The server also calculates pricePerPackage => but let's do a dedicated fetchPrice call
      // if you want to show final price with recyclingFee. 
      // Or you can do everything from the server response.
      await fetchPriceFromServer(resp.data);

    } catch (err) {
      console.error('[createSelectionInSupabase] Error =>', err);
      alert('Error creating selection');
    } finally {
      setIsGenerating(false);
    }
  }

  /**
   * If the server's createTemporarySelection returns a partial price,
   * you can call this to display it. Alternatively, call fetchPrice if needed.
   */
  async function fetchPriceFromServer(serverResp: any) {
    if (serverResp?.pricePerPackage) {
      // store it in local state
      setPrice(serverResp.pricePerPackage);
      setOriginalPrice(serverResp.pricePerPackage);
    }
  }

  /**
   * fetchPrice => calls action="getCalculatedPackagePrice"
   *   if you want a separate server calculation
   */
  async function fetchPrice(selectedProducts: RandomSelectionType) {
    if (!selectedSize || !slug) return;
    try {
      const payload = {
        selectedSize,
        slug,
        selectedProducts,
      };
      console.debug('[fetchPrice] =>', payload);

      const resp = await axios.post('/api/supabase/session', {
        action: 'getCalculatedPackagePrice',
        ...payload,
      });
      if (resp.data?.price) {
        setPrice(resp.data.price);
        setOriginalPrice(resp.data.originalPrice ?? resp.data.price);
        console.debug(
          '[fetchPrice] set price =>',
          resp.data.price,
          ' original =>',
          resp.data.originalPrice
        );
      }
    } catch (err) {
      console.error('[fetchPrice] Error =>', err);
    }
  }

  /**
   * addToBasketAction => calls addItemToBasket from context
   */
  const addToBasketAction = async () => {
    if (!selectionId) {
      alert('No selection found—please create a selection first.');
      return;
    }
    setIsAddingToCart(true);
    try {
      await addItemToBasket({
        selectionId,
        quantity: Number(quantity),
      });
      setShowConfetti(true);
    } catch (err) {
      console.error('[addToBasket] Error =>', err);
      alert('Error adding to basket. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  /**
   * Optionally let user click a "Regenerate" button to overwrite the existing selection
   */
  const handleRegenerate = async () => {
    // Overwrite the selection in DB
    await createSelectionInSupabase(true);
  };

  /** Confetti callback */
  const handleConfettiEnd = () => setShowConfetti(false);

  // ----------- RENDER -----------
  if (loading) {
    return <Loading />;
  }
  if (!product) {
    return <p>Product not found.</p>;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold text-center mb-8">{product.title}</h1>

      <div className="flex flex-col md:flex-row">
        {/* Left: image + description */}
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

        {/* Right: selection + user actions */}
        <div className="md:w-1/2 md:pl-8 flex-1 flex flex-col justify-between">
          {/* 1) Pick package size */}
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

          {/* 2) Sugar preference */}
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

          {/* 3) Random selection display */}
          <div className="mt-4 pr-4 border border-gray-300 rounded">
            <h2 className="text-xl font-bold text-center mt-4">
              Your Random {product.title}
            </h2>
            <ul className="list-disc list-inside mt-4 px-4">
              {/* The randomSelection is empty unless we have some from the DB */}
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

          {/* 4) Buttons + Price */}
          <div className="mt-8">
            <LoadingButton
              onClick={() => createSelectionInSupabase(true)} // Overwrite selection with new random
              loading={isGenerating}
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-full shadow hover:bg-blue-600 transition w-full"
            >
              Regenerate Package
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

      {/* Confetti effect */}
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
