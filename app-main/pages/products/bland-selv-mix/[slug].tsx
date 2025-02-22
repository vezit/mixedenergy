// pages/products/bland-selv-mix/[slug].tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Image from 'next/image';

import { useBasket } from '../../../components/BasketContext';
import Loading from '../../../components/Loading';
import LoadingConfettiButton from '../../../components/LoadingConfettiButton';
import ConfettiAnimation from '../../../components/ConfettiAnimation';
import { getCookie } from '../../../lib/cookies';

//
// Type Definitions
//
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
  packages?: ProductPackage[]; // from DB “package_sizes”
  collectionsDrinks?: string[]; // from joined drinks
}

interface DrinkData {
  name: string;
  image: string;
}

type DrinksDataType = Record<string, DrinkData>;
type SelectedProductsType = Record<string, number>;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

export default function BlandSelvMixProduct() {
  const router = useRouter();
  const slug = router.query.slug as string | undefined;

  // Basket context
  const { addItemToBasket } = useBasket();

  // UI states
  const [loading, setLoading] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Session ID from cookie
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Product + Drinks
  const [product, setProduct] = useState<ProductType | null>(null);
  const [drinksData, setDrinksData] = useState<DrinksDataType>({});

  // User picks
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProductsType>({});

  // For confetti effect
  const addToCartButtonRef = useRef<HTMLButtonElement | null>(null);

  // 1) On mount, load session cookie
  useEffect(() => {
    const sid = getCookie('session_id');
    if (sid) {
      setSessionId(sid);
      console.debug('[BlandSelvMix] Found session_id cookie:', sid);
    } else {
      console.warn('[BlandSelvMix] No session_id cookie found');
    }
  }, []);

  // 2) Fetch product + drinks from /api/supabase/packages/[slug]
  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    (async () => {
      try {
        const resp = await axios.get(`/api/supabase/packages/${slug}`);
        if (!resp.data?.package) {
          console.warn('[BlandSelvMix] No package found for slug=', slug);
          setProduct(null);
          return;
        }
        const pkg: ProductType = resp.data.package;
        setProduct(pkg);

        // If package has sizes, default to first
        if (!selectedSize && pkg.packages && pkg.packages.length > 0) {
          setSelectedSize(pkg.packages[0].size);
        }

        // If package has "collectionsDrinks", fetch them
        if (pkg.collectionsDrinks?.length) {
          const drinksResp = await axios.post('/api/supabase/3-getDrinksBySlugs', {
            slugs: pkg.collectionsDrinks,
          });
          setDrinksData(drinksResp.data?.drinks || {});
        } else {
          setDrinksData({});
        }
      } catch (err) {
        console.error('[BlandSelvMix] fetch product error:', err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, selectedSize]);

  // A helper to count total selected
  const getTotalSelected = useCallback(() => {
    return Object.values(selectedProducts).reduce((sum, qty) => sum + qty, 0);
  }, [selectedProducts]);

  // If user changes quantity
  function handleProductQuantityChange(drinkSlug: string, action: 'increment' | 'decrement') {
    if (!selectedSize) {
      alert('Please select a package size first.');
      return;
    }

    setSelectedProducts((prev) => {
      const currentQty = prev[drinkSlug] || 0;
      let newQty = currentQty;

      if (action === 'increment') {
        // Only increment if total < selectedSize
        if (getTotalSelected() < selectedSize) {
          newQty++;
        }
      } else if (action === 'decrement') {
        // Decrement if currentQty > 0
        if (currentQty > 0) {
          newQty--;
        }
      }

      const updated = { ...prev, [drinkSlug]: newQty };
      if (updated[drinkSlug] <= 0) {
        delete updated[drinkSlug];
      }
      return updated;
    });
  }

  /**
   * createOrUpdateTemporarySelection => 
   *  Calls your single route with { action: 'createTemporarySelection', isMysteryBox=false, selectedProducts: user picks }
   *  The server merges the custom selection into session.temporary_selections.
   *  Returns selectionId + price if needed.
   */
  async function createOrUpdateTemporarySelection(): Promise<string | null> {
    if (!sessionId || !slug || !selectedSize) {
      console.error('[createOrUpdateTemporarySelection] Missing session data or slug.');
      return null;
    }
    // Confirm total = selectedSize
    if (getTotalSelected() !== selectedSize) {
      alert(`Please select exactly ${selectedSize} drinks.`);
      return null;
    }

    try {
      const body = {
        sessionId,
        packageSlug: slug,
        selectedSize,
        isMysteryBox: false,  // because user is picking manually
        sugarPreference: 'alle',  // or you can let user pick
        selectedProducts,
      };
      console.debug('[createOrUpdateTemporarySelection] =>', body);

      const resp = await axios.post('/api/supabase/session', {
        action: 'createTemporarySelection',
        ...body,
      });

      if (!resp.data?.success) {
        console.error('[createOrUpdateTemporarySelection] success=false =>', resp.data.error);
        alert(resp.data.error || 'Error creating selection. Try again.');
        return null;
      }
      console.debug('[createOrUpdateTemporarySelection] Created =>', resp.data.selectionId);
      return resp.data.selectionId as string;
    } catch (err) {
      console.error('[createOrUpdateTemporarySelection] Error =>', err);
      alert('Error creating selection. Please try again.');
      return null;
    }
  }

  // 3) addToBasket => create the custom selection on the server, then call addItemToBasket
  async function addToBasket() {
    if (!selectedSize) {
      alert('Select a package size first.');
      return;
    }
    if (getTotalSelected() !== selectedSize) {
      alert(`Please select exactly ${selectedSize} drinks.`);
      return;
    }

    setIsAddingToCart(true);
    try {
      // 1) create the temp selection
      const selectionId = await createOrUpdateTemporarySelection();
      if (!selectionId) return; // error or user canceled

      // 2) call addItemToBasket from BasketContext
      await addItemToBasket({ selectionId, quantity: 1 });
      setShowConfetti(true);

      // Optionally, clear the user's picks
      setSelectedProducts({});
    } catch (err) {
      console.error('[BlandSelvMix] addToBasket error =>', err);
      alert('Error adding to basket. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  }

  // Confetti callback
  function handleConfettiEnd() {
    setShowConfetti(false);
  }

  // RENDER
  if (loading) {
    return <Loading />;
  }
  if (!product) {
    return <p>Product not found.</p>;
  }

  const totalSelected = getTotalSelected();
  const maxProducts = selectedSize || 0;

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold text-center mb-8">{product.title}</h1>

      <div className="flex flex-col md:flex-row items-center">
        {/* Left: image + description */}
        <div className="md:w-1/2">
          {product.image && (
            <img
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

        {/* Right: picks */}
        <div className="md:w-1/2 md:pl-8 w-full">
          {/* Pick a size */}
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

          {/* List drinks for user selection */}
          <div className="mt-4">
            <p>Select drinks (exactly {maxProducts}):</p>
            {Object.keys(drinksData).map((slug) => {
              const drink = drinksData[slug];
              const currentQty = selectedProducts[slug] || 0;

              return (
                <div
                  key={slug}
                  className="flex items-center justify-between mt-2"
                >
                  <div className="flex items-center">
                    <div className="w-12 aspect-[463/775] relative mr-4">
                      {drink.image && (
                        <Image
                          src={`${SUPABASE_URL}${drink.image}`}
                          alt={drink.name}
                          fill
                          sizes='48'
                          className="object-cover rounded-lg"
                        />
                      )}
                    </div>
                    <span>{drink.name}</span>
                  </div>

                  <div className="flex items-center">
                    <button
                      onClick={() => handleProductQuantityChange(slug, 'decrement')}
                      className="px-2 py-1 bg-gray-200 rounded-l"
                      disabled={currentQty === 0}
                    >
                      -
                    </button>
                    <span className="px-4 py-2 bg-gray-100">{currentQty}</span>
                    <button
                      onClick={() => handleProductQuantityChange(slug, 'increment')}
                      className="px-2 py-1 bg-gray-200 rounded-r"
                      disabled={totalSelected >= maxProducts}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
            <p className="mt-2 text-sm text-gray-600">
              Selected {totalSelected} of {maxProducts} drinks
            </p>
          </div>

          <LoadingConfettiButton
            ref={addToCartButtonRef}
            onClick={addToBasket}
            loading={isAddingToCart}
            disabled={getTotalSelected() !== selectedSize || !selectedSize}
            className="mt-4 bg-red-500 text-white px-6 py-2 rounded-full shadow 
             hover:bg-red-600 transition w-full disabled:bg-gray-300"
          >
            Add Mixed Package to Cart
          </LoadingConfettiButton>

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
