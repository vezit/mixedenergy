// pages/products/vi-blander-for-dig/[slug].tsx
import React, { useState, useEffect, useRef } from 'react';
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

/** Data from DB about package sizes. */
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
  packages?: ProductPackage[];  // from "package_sizes"
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

/** 
 * After calling createTemporarySelection, we might get price etc. 
 * from "priceData" or direct return. 
 */
interface PriceData {
  pricePerPackage: number;
  recyclingFeePerPackage: number;
  originalTotalPrice: number;
}

interface SessionTemporarySelection {
  selectedProducts: RandomSelectionType;
  selectedSize: number;
  packageSlug: string;
  sugarPreference?: string;
  isMysteryBox?: boolean;
  createdAt: string;
  priceData?: PriceData;
}

/** 
 * The shape of "temporary_selections" in DB 
 */
type TemporarySelections = Record<string, SessionTemporarySelection>;

export default function ViBlanderForDigProduct() {
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

  // The product from DB
  const [product, setProduct] = useState<ProductType | null>(null);

  // The "random" selection for the user
  const [randomSelection, setRandomSelection] = useState<RandomSelectionType>({});
  const [selectionId, setSelectionId] = useState<string | null>(null);

  // Pricing
  const [price, setPrice] = useState<number>(0);
  const [originalPrice, setOriginalPrice] = useState<number>(0);

  // User's chosen size & sugar preference
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [sugarPreference, setSugarPreference] = useState<'alle' | 'med_sukker' | 'uden_sukker'>('alle');

  // The number of packages to add to cart
  const [quantity, setQuantity] = useState<number>(1);

  // Drinks info for display
  const [drinksData, setDrinksData] = useState<DrinksDataType>({});

  // For confetti effect
  const addToCartButtonRef = useRef<HTMLButtonElement | null>(null);

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  // 1) On mount, read session_id from cookie
  useEffect(() => {
    const sid = getCookie('session_id');
    if (sid) {
      setSessionId(sid);
      console.debug('[ViBlanderForDigProduct] Found session_id cookie:', sid);
    } else {
      console.warn('No session_id cookie found');
    }
  }, []);

  // 2) Whenever slug changes, load the product
  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    (async function fetchProduct() {
      try {
        const resp = await axios.get(`/api/supabase/packages/${slug}`);
        if (!resp.data?.package) {
          console.warn('No package found for slug=', slug);
          setProduct(null);
          return;
        }
        const pkg: ProductType = resp.data.package;
        setProduct(pkg);

        // If we have package sizes, default to the first
        if (pkg.packages && pkg.packages.length > 0) {
          setSelectedSize(pkg.packages[0].size);
        }

        // If "collectionsDrinks" exist, fetch them
        if (pkg.collectionsDrinks?.length) {
          const drinksResp = await axios.post('/api/supabase/3-getDrinksBySlugs', {
            slugs: pkg.collectionsDrinks,
          });
          setDrinksData(drinksResp.data?.drinks || {});
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

  // 3) Whenever the user changes selectedSize or sugarPreference => fetch or create selection
  //    i.e., if no "selectionKey" in DB => call createTemporarySelection
  useEffect(() => {
    if (!sessionId || !product || !selectedSize) {
      // Not enough info yet
      return;
    }
    void fetchOrCreateSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, product, selectedSize, sugarPreference]);

  /**
   * fetchOrCreateSelection => 
   *    1) GET /api/supabase/session
   *    2) Check "temporary_selections[selectionKey]"
   *    3) If not found => createTemporarySelection
   *    4) Then set local states (randomSelection, selectionId, price, etc.)
   */
  async function fetchOrCreateSelection() {
    setLoading(true);
    try {
      // 1) GET session
      const sessionResp = await axios.get('/api/supabase/session');
      const currentSession = sessionResp.data?.session;
      if (!currentSession) {
        console.warn('[fetchOrCreateSelection] No session returned from server');
        return;
      }

      const selectionKey = buildSelectionKey(slug, selectedSize, sugarPreference);
      const tempSelections = currentSession.temporary_selections as TemporarySelections || {};

      // 2) see if we have a selection at that key
      const existing = tempSelections[selectionKey];
      if (existing) {
        console.debug('[fetchOrCreateSelection] Found existing selection =>', selectionKey);
        setRandomSelection(existing.selectedProducts || {});
        setSelectionId(selectionKey);

        // Price => either from existing.priceData or we can do separate
        if (existing.priceData) {
          setPrice(existing.priceData.pricePerPackage);
          setOriginalPrice(existing.priceData.originalTotalPrice || existing.priceData.pricePerPackage);
        } else {
          // no priceData => fallback? e.g. do a getCalculatedPackagePrice call
          await doSeparatePriceCalc(existing.selectedProducts);
        }
      } else {
        console.debug('[fetchOrCreateSelection] Not found => calling createTemporarySelection');
        await createTemporarySelection(true);
      }
    } catch (err) {
      console.error('[fetchOrCreateSelection] Error =>', err);
    } finally {
      setLoading(false);
    }
  }

  /**
   * createTemporarySelection => calls POST /api/supabase/session with "createTemporarySelection"
   *    isMysteryBox => random picks on server
   */
  async function createTemporarySelection(isMysteryBox: boolean) {
    if (!sessionId || !slug || !selectedSize) return;

    setIsGenerating(true);
    try {
      const body = {
        sessionId,
        packageSlug: slug,
        selectedSize,
        sugarPreference,
        isMysteryBox,
      };
      console.debug('[createTemporarySelection] =>', body);

      const resp = await axios.post('/api/supabase/session', {
        action: 'createTemporarySelection',
        ...body,
      });
      if (!resp.data?.success) {
        console.error('[createTemporarySelection] success=false =>', resp.data.error);
        alert(resp.data.error || 'Error creating selection');
        return;
      }

      // from server: e.g. { selectionId, pricePerPackage, recyclingFeePerPackage, originalTotalPrice }
      const { selectionId, pricePerPackage, originalTotalPrice } = resp.data;
      console.debug('[createTemporarySelection] Created =>', selectionId);

      setSelectionId(selectionId);
      setPrice(pricePerPackage);
      setOriginalPrice(originalTotalPrice ?? pricePerPackage);

      // We'll re-fetch the session to get the random drinks
      // or you can store them in the server response. 
      await fetchOrCreateSelection();
    } catch (err) {
      console.error('[createTemporarySelection] Error =>', err);
      alert('Error creating selection');
    } finally {
      setIsGenerating(false);
    }
  }

  /**
   * doSeparatePriceCalc => if we want a separate "getCalculatedPackagePrice" call
   */
  async function doSeparatePriceCalc(selectedProducts: RandomSelectionType) {
    if (!selectedSize || !slug) return;
    try {
      const resp = await axios.post('/api/supabase/session', {
        action: 'getCalculatedPackagePrice',
        slug,
        selectedSize,
        selectedProducts,
      });
      if (resp.data?.price) {
        setPrice(resp.data.price);
        setOriginalPrice(resp.data.originalPrice ?? resp.data.price);
      }
    } catch (err) {
      console.error('[doSeparatePriceCalc] Error =>', err);
    }
  }

  // For the unique key => "mixed-boosters-12-alle"
  function buildSelectionKey(slug: string, size: number | null, pref: string): string {
    return `${slug}-${size}-${pref}`;
  }

  /**
   * Overwrite selection => call createTemporarySelection again
   */
  async function regenerateSelection() {
    await createTemporarySelection(true);
  }

  /**
   * addToBasket => calls addItemToBasket from your basket context
   */
  async function addToBasketAction() {
    if (!selectionId) {
      alert('No selection found—create a selection first');
      return;
    }
    setIsAddingToCart(true);
    try {
      await addItemToBasket({
        selectionId,
        quantity,
      });
      setShowConfetti(true);
    } catch (err) {
      console.error('[addToBasket] Error =>', err);
      alert('Error adding to basket');
    } finally {
      setIsAddingToCart(false);
    }
  }

  // Confetti callback
  function handleConfettiEnd() {
    setShowConfetti(false);
  }

  // -------------- RENDER --------------
  if (loading) {
    return <Loading />;
  }
  if (!product) {
    return <p>Produkt ikke fundet.</p>;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold text-center mb-8">{product.title}</h1>

      <div className="flex flex-col md:flex-row">
        {/* Left side: product image + description */}
        <div className="md:w-1/2 flex-1">
          {product.image && (
            <img
              src={`${SUPABASE_URL}/${product.image}`}
              alt={product.title}
              className="w-full h-auto"
            />
          )}
          <div className="mt-6">
            <h2 className="text-2xl font-bold mb-2">Beskrivelse</h2>
            <p className="text-lg text-gray-700">{product.description}</p>
          </div>
        </div>

        {/* Right side: selection & user controls */}
        <div className="md:w-1/2 md:pl-8 flex-1 flex flex-col justify-between">
          {/* 1) Select package size */}
          <div className="mt-4">
            <p>Vælg pakkestørrelse:</p>
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
                  {pkg.size} stk
                </label>
              ))
            ) : (
              <p>Ingen pakkestørrelser tilgængelige.</p>
            )}
          </div>

          {/* 2) Sugar preference */}
          <div className="mt-4">
            <p>Med eller uden sukker:</p>
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
                            sizes='48'
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

          {/* 4) Buttons & Price */}
          <div className="mt-8">
            <LoadingButton
              onClick={regenerateSelection}
              loading={isGenerating}
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-full shadow hover:bg-blue-600 transition w-full"
            >
              Generér ny pakke
            </LoadingButton>

            <LoadingConfettiButton
              ref={addToCartButtonRef}
              onClick={addToBasketAction}
              loading={isAddingToCart}
              className="mt-4 bg-red-500 text-white px-6 py-2 rounded-full shadow hover:bg-red-600 transition w-full"
            >
              Tilføj til kurv
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
}
