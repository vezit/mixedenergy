import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useBasket } from '../../../lib/BasketContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import Link from 'next/link';

export default function BlandSelvMixProduct() {
  const router = useRouter();
  const { slug } = router.query;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drinks, setDrinks] = useState([]); // Drinks associated with the product

  const { addItemToBasket } = useBasket();
  const [selectedSize, setSelectedSize] = useState(8); // Default package size
  const [selectedProducts, setSelectedProducts] = useState({});
  const [price, setPrice] = useState(19900); // Default price for size 8
  const [quantity, setQuantity] = useState(1);
  const maxProducts = parseInt(selectedSize);

  useEffect(() => {
    if (!slug) return;

    const fetchProduct = async () => {
      const docRef = doc(db, 'packages', slug);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const productData = docSnap.data();
        setProduct({ id: docSnap.id, ...productData });
        setDrinks(productData.drinks || []); // Set the associated drinks list
      } else {
        setProduct(null);
      }
      setLoading(false);
    };

    fetchProduct();
  }, [slug]);

  // Generate a random selection on component mount
  useEffect(() => {
    generateRandomSelection(selectedSize);
  }, [drinks]);

  // Update price and regenerate selection when package size changes
  useEffect(() => {
    const selectedPackage = product?.packages.find((pkg) => pkg.size === selectedSize);
    if (selectedPackage) {
      setPrice(selectedPackage.price);
      generateRandomSelection(selectedSize);
    }
  }, [selectedSize, product]);

  // Function to generate a random selection of drinks
  const generateRandomSelection = (size) => {
    const randomSelection = {};
    let remaining = parseInt(size);
    const drinksCopy = [...drinks];

    while (remaining > 0 && drinksCopy.length > 0) {
      const randomIndex = Math.floor(Math.random() * drinksCopy.length);
      const drink = drinksCopy[randomIndex];
      const maxQty = remaining;
      const qty = Math.ceil(Math.random() * maxQty);

      randomSelection[drink] = (randomSelection[drink] || 0) + qty;
      remaining -= qty;

      // Remove the drink if no more can be added
      drinksCopy.splice(randomIndex, 1);
    }

    setSelectedProducts(randomSelection);
  };

  // Function to handle quantity changes
  const handleProductQuantityChange = (drink, action) => {
    setSelectedProducts((prevSelected) => {
      const currentQty = prevSelected[drink] || 0;
      let newQty = currentQty;

      if (action === 'increment' && getTotalSelected() < maxProducts) {
        newQty = currentQty + 1;
      } else if (action === 'decrement' && currentQty > 0) {
        newQty = currentQty - 1;
      }

      const updatedSelected = { ...prevSelected, [drink]: newQty };
      if (newQty === 0) {
        delete updatedSelected[drink];
      }

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
        .map(([drink, qty]) => `${drink} (x${qty})`)
        .join(', ')}`,
      image: product.image,
      price: price * quantity,
      quantity: quantity,
      selectedSize: selectedSize,
      selectedProducts: selectedProducts,
    };

    addItemToBasket(mixedProduct);
  };

  if (loading) {
    return <p>Loading...</p>;
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
            {drinks.map((drink, index) => (
              <div key={index} className="flex items-center justify-between mt-2">
                <span>{drink}</span>
                <div className="flex items-center">
                  <button
                    onClick={() => handleProductQuantityChange(drink, 'decrement')}
                    className="px-2 py-1 bg-gray-200 rounded-l"
                    disabled={!selectedProducts[drink]}
                  >
                    -
                  </button>
                  <span className="px-4 py-2 bg-gray-100">
                    {selectedProducts[drink] || 0}
                  </span>
                  <button
                    onClick={() => handleProductQuantityChange(drink, 'increment')}
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
          <p className="text-2xl font-bold mt-4">{price * quantity / 100} kr</p>
        </div>
      </div>
    </div>
  );
}
