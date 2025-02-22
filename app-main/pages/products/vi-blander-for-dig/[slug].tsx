// pages/products/vi-blander-for-dig/[slug].tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Image from 'next/image';

import { useBasket } from '../../../components/BasketContext';
import Loading from '../../../components/Loading';
import LoadingConfettiButton from '../../../components/LoadingConfettiButton';
import ConfettiAnimation from '../../../components/ConfettiAnimation';
import { getCookie } from '../../../lib/cookies';

/** Data from DB about package sizes. */
interface ProductPackage {
  size: number;
  discount?: number;
  roundUpOrDown?: number;
}

/** Our main product data. */
interface ProductType {
  slug: string;
  title: string;
  image: string;
  description: string;
  category?: string;
  packages?: ProductPackage[];  // from "package_sizes"
  collectionsDrinks?: string[]; // from joined drinks
}

/** Drink data stored by slug => { name, image }. */
type DrinksDataType = Record<
  string,
  {
    name: string;
    image: string;
  }
>;

/** The user’s chosen products: { [drinkSlug]: quantity }. */
type SelectedProductsType = Record<string, number>;

/** Optional: store the price structure if needed. */
interface PriceData {
  price: number;         // final price for the entire package
  originalPrice: number; // the pre-discount price
}

/** For “temporary_selections” in the session. Not always needed client-side, but shown for clarity. */
interface SessionTemporarySelection {
  selectedProducts: SelectedProductsType;
  selectedSize: number;
  packageSlug: string;
  isMysteryBox: boolean; // always false here
  createdAt: string;
  priceData?: {
    pricePerPackage: number;
    recyclingFeePerPackage?: number;
    originalTotalPrice?: number;
  };
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

export default function BlandSelvMixProduct() {
  const router = useRouter();
  const slug = router.query.slug as string | undefined;

  // Basket context
  const { addItemToBasket } = useBasket();

  // Basic UI states
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  // The session_id from cookie
  const [sessionId, setSessionId] = useState<string | null>(null);

  // The product data
  const [product, setProduct] = useState<ProductType | null>(null);

  // Drinks data (for display)
  const [drinksData, setDrinksData] = useState<DrinksDataType>({});

  // The user’s chosen size & picks
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProductsType>({});

  // Price (fetched from server, based on picks)
  const [price, setPrice] = useState<number>(0);
  const [originalPrice, setOriginalPrice] = useState<number>(0);

  // For confetti effect
  const addToCartButtonRef = useRef<HTMLButtonElement | null>(null);

  // -- 1) On mount, read session_id cookie --
  useEffect(() => {
    const sid = getCookie('session_id');
    if (sid) {
      setSessionId(sid);
      console.debug('[BlandSelvMix] Found session_id:', sid);
    } else {
      console.warn('[BlandSelvMix] No session_id cookie found');
    }
  }, []);

  // -- 2) Fetch product (and associated drinks) from DB via your API route --
  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    (async () => {
      try {
        const resp = await axios.get(`/api/supabase/packages/${slug}`);
        if (!resp.data?.package) {
          console.warn(`[BlandSelvMix] No package found for slug=${slug}`);
          setProduct(null);
          return;
        }
        const pkg: ProductType = resp.data.package;
        setProduct(pkg);

        // Default to the first size if available:
        if (pkg.packages && pkg.packages.length > 0) {
          setSelectedSize(pkg.packages[0].size);
        }

        // If product has "collectionsDrinks", fetch them for display
        if (pkg.collectionsDrinks?.length) {
          const drinksResp = await axios.post('/api/supabase/3-getDrinksBySlugs', {
            slugs: pkg.collectionsDrinks,
          });
          setDrinksData(drinksResp.data?.drinks || {});
        } else {
          setDrinksData({});
        }
      } catch (err) {
        console.error('[BlandSelvMix] Error fetching product =>', err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  // -- 3) Price Calculation each time user changes picks or size --
  useEffect(() => {
    // Only calculate price if we have everything needed
    if (!sessionId || !slug || !selectedSize) return;
    if (Object.keys(selectedProducts).length === 0) {
      // If user hasn't picked anything yet, price is 0 or ignore
      setPrice(0);
      setOriginalPrice(0);
      return;
    }

    // Calculate price on the server
    calculatePrice();
  }, [sessionId, slug, selectedSize, selectedProducts]);

  async function calculatePrice() {
    try {
      const body = {
        action: 'getCalculatedPackagePrice',
        slug,
        selectedSize,
        selectedProducts,
      };
      console.debug('[BlandSelvMix] calculatePrice =>', body);
      const resp = await axios.post('/api/supabase/session', body);
      if (resp.data?.price) {
        setPrice(resp.data.price);
        setOriginalPrice(resp.data.originalPrice ?? resp.data.price);
      }
    } catch (err) {
      console.error('[BlandSelvMix] calculatePrice error =>', err);
    }
  }

  // A helper to count total selected items
  const getTotalSelected = useCallback(() => {
    return Object.values(selectedProducts).reduce((sum, qty) => sum + qty, 0);
  }, [selectedProducts]);

  // -- 4) User changes the quantity of a particular drink --
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
        if (currentQty > 0) {
          newQty--;
        }
      }

      const updated = { ...prev, [drinkSlug]: newQty };
      // Remove slug from object if qty is 0
      if (updated[drinkSlug] <= 0) {
        delete updated[drinkSlug];
      }
      return updated;
    });
  }

  // -- 5) Create the selection in DB and add to basket --
  async function addToBasketAction() {
    if (!sessionId || !slug || !selectedSize) {
      alert('Missing session or product info.');
      return;
    }
    if (getTotalSelected() !== selectedSize) {
      alert(`Please select exactly ${selectedSize} drinks.`);
      return;
    }

    setIsAddingToCart(true);
    try {
      // 5.1) Create a new “temporary selection” in the session
      //      (or overwrite existing) with your chosen picks
      const createResp = await axios.post('/api/supabase/session', {
        action: 'createTemporarySelection',
        sessionId,
        packageSlug: slug,
        selectedSize,
        isMysteryBox: false, // since user is manually picking
        selectedProducts,
      });
      if (!createResp.data?.success) {
        console.error('[BlandSelvMix] createTemporarySelection =>', createResp.data.error);
        alert(createResp.data.error || 'Error creating selection. Try again.');
        return;
      }

      // 5.2) The server returns a selectionId
      const selectionId = createResp.data.selectionId;
      if (!selectionId) {
        alert('No selectionId returned. Cannot add to basket.');
        return;
      }

      // 5.3) Add that selection to the basket
      await addItemToBasket({
        selectionId,
        quantity: 1,
      });

      // 5.4) Fire confetti
      setShowConfetti(true);

      // Optionally, reset user picks
      // setSelectedProducts({});
    } catch (err) {
      console.error('[BlandSelvMix] addToBasket error =>', err);
      alert('Error adding to basket. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  }

  // Confetti end callback
  function handleConfettiEnd() {
    setShowConfetti(false);
  }

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
      <h1 className="text-4xl font-bold text-center mb-8">
        {product.title}
      </h1>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left: Image + Description */}
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

        {/* Right: Selection UI */}
        <div className="md:w-1/2">
          {/* 1) Package Size Options */}
          <div className="mb-4">
            <p className="font-semibold">Choose Package Size:</p>
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
                  <span className="ml-1">{pkg.size} pcs</span>
                </label>
              ))
            ) : (
              <p>No package sizes available.</p>
            )}
          </div>

          {/* 2) Drinks Pickers */}
          <div>
            <p className="font-semibold">
              Select exactly {maxProducts} drinks:
            </p>
            {Object.keys(drinksData).map((drinkSlug) => {
              const drink = drinksData[drinkSlug];
              const currentQty = selectedProducts[drinkSlug] || 0;

              return (
                <div
                  key={drinkSlug}
                  className="flex items-center justify-between mt-2"
                >
                  <div className="flex items-center">
                    <div className="w-12 aspect-[463/775] relative mr-4">
                      {drink.image && (
                        <Image
                          src={`${SUPABASE_URL}${drink.image}`}
                          alt={drink.name}
                          fill
                          className="object-cover rounded-lg"
                        />
                      )}
                    </div>
                    <span>{drink.name}</span>
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

          {/* 3) Pricing Display */}
          <div className="mt-6">
            {originalPrice > price && price > 0 ? (
              <div className="text-2xl font-bold">
                <span className="line-through text-gray-500 mr-2">
                  {(originalPrice / 100).toFixed(2)} kr
                </span>
                <span>{(price / 100).toFixed(2)} kr</span>
              </div>
            ) : (
              <div className="text-2xl font-bold">
                {price > 0 ? (
                  <span>{(price / 100).toFixed(2)} kr</span>
                ) : (
                  <span>0 kr</span>
                )}
              </div>
            )}
          </div>

          {/* 4) Add to Cart Button */}
          <LoadingConfettiButton
            ref={addToCartButtonRef}
            onClick={addToBasketAction}
            loading={isAddingToCart}
            className="mt-4 bg-red-500 text-white px-6 py-2 rounded-full shadow hover:bg-red-600 transition w-full"
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
