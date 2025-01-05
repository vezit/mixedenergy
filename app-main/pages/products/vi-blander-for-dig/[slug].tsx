import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  MutableRefObject,
} from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

// Next.js components
import Link from 'next/link';
import Image from 'next/image';

// Custom Hooks / Components
import { useBasket } from '../../../components/BasketContext';
import Loading from '../../../components/Loading';
import LoadingButton from '../../../components/LoadingButton';
import LoadingConfettiButton from '../../../components/LoadingConfettiButton';
import ConfettiAnimation from '../../../components/ConfettiAnimation';

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
  // Type assertion to ensure we treat slug as a string
  const slug = router.query.slug as string;

  // IMPORTANT: Make sure to allow null in the type here
  const addToCartButtonRef = useRef<HTMLButtonElement | null>(null);

  const [product, setProduct] = useState<ProductType | null>(null);
  const [drinksData, setDrinksData] = useState<DrinksDataType>({});
  const [loading, setLoading] = useState<boolean>(true);

  // For storing multiple (size + sugarPreference) combos
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

  const { addItemToBasket } = useBasket();

  // Generate a unique key for the current options
  const getSelectionKey = useCallback((): string => {
    return `${selectedSize}_${sugarPreference}`;
  }, [selectedSize, sugarPreference]);

  // Load selections from localStorage on mount (only when `slug` is known)
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

  // Fetch product and drinks data
  useEffect(() => {
    if (!slug) return;

    const fetchProductAndDrinks = async () => {
      setLoading(true);
      try {
        // 1) Fetch product data
        const productResponse = await axios.get(`/api/firebase/products/${slug}`);
        const productData = productResponse.data.package as ProductType;
        setProduct(productData);

        // Set default selected size
        if (productData?.packages && productData.packages.length > 0) {
          setSelectedSize(productData.packages[0].size);
        }

        // 2) Fetch drinks data
        if (productData?.collectionsDrinks?.length) {
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
  }, [slug]);

  // On changes to selectedSize / sugarPreference: use existing or generate new
  useEffect(() => {
    if (!product || selectedSize === null) return;

    const selectionKey = getSelectionKey();

    // Check if we already have a selection for the current options
    if (selections[selectionKey]) {
      const { selectedProducts, selectionId } = selections[selectionKey];
      setRandomSelection(selectedProducts);
      setSelectionId(selectionId);
      void fetchPrice(selectedProducts);
    } else {
      // If not existing, generate a new random package
      void generateRandomPackage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSize, sugarPreference, product]);

  const handleConfettiEnd = () => {
    setShowConfetti(false);
  };

  // Function to generate a random package
  const generateRandomPackage = async () => {
    setIsGenerating(true);
    try {
      const response = await axios.post('/api/firebase/4-generateRandomSelection', {
        slug,
        selectedSize,
        sugarPreference,
      });

      if (response.data.success) {
        const { selectedProducts, selectionId } = response.data as {
          selectedProducts: RandomSelectionType;
          selectionId: string;
        };
        setRandomSelection(selectedProducts);
        setSelectionId(selectionId);

        // Store the selection in state
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
        console.error('Failed to generate package:', response.data);
        alert('Failed to generate package: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Error generating package:', error);
      alert('Error generating package: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper: create a new selection in DB
  const createTemporarySelection = async (): Promise<string | null> => {
    try {
      const response = await axios.post('/api/firebase/4-createTemporarySelection', {
        selectedProducts: randomSelection,
        selectedSize,
        packageSlug: slug,
        isMysteryBox: false,
        sugarPreference,
      });

      if (response.data.success) {
        const newSelectionId = response.data.selectionId as string;
        setSelectionId(newSelectionId);

        // Update state
        const selectionKey = getSelectionKey();
        const newSelections: SelectionsType = {
          ...selections,
          [selectionKey]: {
            selectedProducts: randomSelection,
            selectionId: newSelectionId,
          },
        };
        setSelections(newSelections);

        // Save to localStorage
        const storedData = localStorage.getItem('slugViBlander');
        const allSelections = storedData ? JSON.parse(storedData) : {};
        allSelections[slug] = newSelections;
        localStorage.setItem('slugViBlander', JSON.stringify(allSelections));

        return newSelectionId;
      } else {
        console.error('Failed to create temporary selection:', response.data);
        alert('Failed to create temporary selection: ' + (response.data.error || 'Unknown error'));
        return null;
      }
    } catch (error: any) {
      console.error('Error creating temporary selection:', error);
      alert('Error creating temporary selection: ' + error.message);
      return null;
    }
  };

  // Fetch price from the API
  const fetchPrice = async (selection: RandomSelectionType) => {
    try {
      const payload = {
        selectedSize,
        slug,
        selectedProducts: selection,
      };

      const response = await axios.post('/api/firebase/3-getCalculatedPackagePrice', payload);

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

  // Handle package size change
  const handleSizeChange = (size: number) => {
    setSelectedSize(size);
  };

  // Add the random package to the basket
  const addToBasket = async () => {
    if (!selectionId) {
      alert('Please generate a package first.');
      return;
    }

    setIsAddingToCart(true);
    try {
      const mixedProduct = {
        selectionId,
        quantity: parseInt(quantity.toString(), 10),
      };

      await addItemToBasket(mixedProduct);
      setShowConfetti(true); // Trigger confetti
    } catch (error: any) {
      console.error('Error adding to basket:', error);

      // If selectionId is invalid or expired, try creating a new one
      if (
        error.response &&
        error.response.data &&
        error.response.data.error === 'Invalid or expired selectionId'
      ) {
        const newSelectionId = await createTemporarySelection();
        if (newSelectionId) {
          try {
            const mixedProduct = {
              selectionId: newSelectionId,
              quantity: parseInt(quantity.toString(), 10),
            };
            await addItemToBasket(mixedProduct);
            setShowConfetti(true);
          } catch (err) {
            console.error('Error adding to basket with new selectionId:', err);
            alert('Error adding to basket. Please try again.');
          }
        } else {
          alert('Failed to create a new selection. Please try generating a new package.');
        }
      } else {
        alert('Error adding to basket. Please try again.');
      }
    } finally {
      setIsAddingToCart(false);
    }
  };

  // -------------------
  // Render JSX
  // -------------------
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
        <div className="md:w-1/2 flex-1">
          {product.image && (
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-auto"
            />
          )}

          {/* Description */}
          <div className="mt-6">
            <h2 className="text-2xl font-bold mb-2">Description</h2>
            <p className="text-lg text-gray-700">{product.description}</p>
          </div>
        </div>

        {/* Right Column: Random Package and Actions */}
        <div className="md:w-1/2 md:pl-8 flex flex-col justify-between h-full flex-1">
          <div>
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
                      onChange={() => handleSizeChange(pkg.size)}
                    />
                    {pkg.size} pcs
                  </label>
                ))
              ) : (
                <p>No package sizes available.</p>
              )}
            </div>

            {/* Sugar Preference Selection */}
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
                Alle (både med og uden sukker)
              </label>
            </div>

            {/* Display Random Package */}
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
            {/* Generate Button */}
            <LoadingButton
              onClick={generateRandomPackage}
              loading={isGenerating}
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-full shadow hover:bg-blue-600 transition w-full"
            >
              Generate New Package
            </LoadingButton>

            {/* Add to Basket Button */}
            <LoadingConfettiButton
              ref={addToCartButtonRef}
              onClick={addToBasket}
              loading={isAddingToCart}
              className="mt-4 bg-red-500 text-white px-6 py-2 rounded-full shadow hover:bg-red-600 transition w-full"
            >
              Add to Cart
            </LoadingConfettiButton>

            {/* Price */}
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

      {/* Render Confetti */}
      {showConfetti && (
        <ConfettiAnimation onAnimationEnd={handleConfettiEnd} buttonRef={addToCartButtonRef} />
      )}
    </div>
  );
};

export default ViBlanderForDigProduct;
