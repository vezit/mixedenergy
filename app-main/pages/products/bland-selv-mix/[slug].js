// /products/bland-selv-mix/[slug].js
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useBasket } from '../../../components/BasketContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import Loading from '/components/Loading';

export default function BlandSelvMixProduct() {
  const router = useRouter();
  const { slug } = router.query;

  const [product, setProduct] = useState(null);
  const [drinksData, setDrinksData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [price, setPrice] = useState(0); // Initialize price to 0
  const [selectedSize, setSelectedSize] = useState(8); // Default package size
  const [quantity, setQuantity] = useState(1);
  const maxProducts = parseInt(selectedSize);

  const { addItemToBasket } = useBasket();

  useEffect(() => {
    if (!slug) return;
  
    const fetchProduct = async () => {
      const docRef = doc(db, 'packages_public', slug);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const productData = docSnap.data();
        setProduct({ id: docSnap.id, ...productData });
  
        // Fetch drinks data
        const drinksData = {};
        for (const drinkSlug of productData.drinks) {
          const drinkDocRef = doc(db, 'drinks_public', drinkSlug);
          const drinkDocSnap = await getDoc(drinkDocRef);
          if (drinkDocSnap.exists()) {
            drinksData[drinkSlug] = drinkDocSnap.data();
          }
        }
        setDrinksData(drinksData);
        // Remove automatic selection on load
      } else {
        setProduct(null);
      }
      setLoading(false);
    };
  
    fetchProduct();
  }, [slug]);
  

  // Update price and regenerate selection when package size changes
  useEffect(() => {
    generateRandomSelection(selectedSize);
  }, [selectedSize]);

  // Function to generate a random selection of drinks
 // Update generateRandomSelection to use the new price calculation
const generateRandomSelection = (size, drinksDataParam = drinksData) => {
  const randomSelection = {};
  let remaining = parseInt(size);
  const drinksCopy = Object.keys(drinksDataParam);

  // Modify this part to not automatically select drinks
  while (remaining > 0 && drinksCopy.length > 0) {
    const randomIndex = Math.floor(Math.random() * drinksCopy.length);
    const drinkSlug = drinksCopy[randomIndex];
    const qty = 1; // Select one at a time

    randomSelection[drinkSlug] = (randomSelection[drinkSlug] || 0) + qty;
    remaining -= qty;

    // Optionally remove the drink if we don't want duplicates
    // drinksCopy.splice(randomIndex, 1);
  }

  setSelectedProducts(randomSelection);

  // Calculate price with discounts
  const { totalPrice, discountedPrice } = calculateTotalPrice(randomSelection);
  setPrice(discountedPrice); // Update the state with the discounted price
};

  // Function to calculate the total price with discounts
const calculateTotalPrice = (selection) => {
  let totalPrice = 0;
  for (const [drinkSlug, qty] of Object.entries(selection)) {
    const drink = drinksData[drinkSlug];
    if (drink && drink.salePrice) {
      // convert drink.salePrice
      totalPrice += parseInt(drink.salePrice) * qty;
    }
  }

  // Apply discounts based on package size
  let discount = 0;
  if (parseInt(selectedSize) === 12) {
    discount = 0.05; // 5% discount
  } else if (parseInt(selectedSize) === 18) {
    discount = 0.10; // 10% discount
  }

  const discountedPrice = totalPrice * (1 - discount);
  return { totalPrice, discountedPrice, discount };
};


  // Function to handle quantity changes
  const handleProductQuantityChange = (drinkSlug, action) => {
    setSelectedProducts((prevSelected) => {
      const currentQty = prevSelected[drinkSlug] || 0;
      let newQty = currentQty;
  
      if (action === 'increment' && getTotalSelected() < maxProducts) {
        newQty = currentQty + 1;
      } else if (action === 'decrement' && currentQty > 0) {
        newQty = currentQty - 1;
      }
  
      const updatedSelected = { ...prevSelected, [drinkSlug]: newQty };
      if (newQty === 0) {
        delete updatedSelected[drinkSlug];
      }
  
      // Recalculate price
      const { discountedPrice } = calculateTotalPrice(updatedSelected);
      setPrice(discountedPrice); // Use discountedPrice, which is a number
  
      return updatedSelected;
    });
  };
  

  // Calculate the total number of selected drinks
  const getTotalSelected = () => {
    return Object.values(selectedProducts).reduce((sum, qty) => sum + qty, 0);
  };

  // Function to add the selected products to the basket
  const addToBasket = () => {
    if (getTotalSelected() !== maxProducts) {
      alert(`Please select exactly ${maxProducts} drinks.`);
      return;
    }

    const mixedProduct = {
      slug: product.id,
      title: `${product.title} - ${selectedSize} pcs`,
      description: `A mix of: ${Object.entries(selectedProducts)
        .map(([drinkSlug, qty]) => `${drinksData[drinkSlug]?.name || drinkSlug} (x${qty})`)
        .join(', ')}`,
      image: product.image,
      price: price, // Total price per package
      quantity: quantity,
      selectedSize: selectedSize,
      selectedProducts: selectedProducts,
    };

    addItemToBasket(mixedProduct);
  };

  if (loading) {
    return  <Loading />;
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
        <div className="md:w-1/2">
          <img src={product.image} alt={product.title} className="w-full h-auto" />

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
            {product.packages.map((pkg) => (
              <label key={pkg.size} className="mr-4">
                <input
                  type="radio"
                  name="size"
                  value={pkg.size}
                  checked={selectedSize === pkg.size}
                  onChange={() => setSelectedSize(pkg.size)}
                />
                {pkg.size}
              </label>
            ))}
          </div>

          {/* Scrollable Drinks Selection */}
          <div className="mt-4 max-h-[500px] overflow-y-auto pr-4">
            <p>Select drinks (exactly {maxProducts}):</p>
            {Object.keys(drinksData).map((drinkSlug, index) => (
              <div key={index} className="flex items-center justify-between mt-2">
                <span>{drinksData[drinkSlug]?.name || drinkSlug}</span>
                <div className="flex items-center">
                  <button
                    onClick={() => handleProductQuantityChange(drinkSlug, 'decrement')}
                    className="px-2 py-1 bg-gray-200 rounded-l"
                    disabled={!selectedProducts[drinkSlug]}
                  >
                    -
                  </button>
                  <span className="px-4 py-2 bg-gray-100">
                    {selectedProducts[drinkSlug] || 0}
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
            ))}
            <p className="mt-2 text-red-600">
              You have selected {getTotalSelected()} out of {maxProducts} drinks.
            </p>
          </div>

          {/* Add to Basket Button */}
          <button
            onClick={addToBasket}
            className="mt-6 bg-red-500 text-white px-6 py-2 rounded-full shadow hover:bg-red-600 transition"
          >
            Add Mixed Package to Cart
          </button>

          {/* Price */}
          <p className="text-2xl font-bold mt-4">{(price * quantity / 100).toFixed(2)} kr</p>
        </div>
      </div>
    </div>
  );
}
