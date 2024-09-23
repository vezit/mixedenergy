import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useBasket } from '../../../lib/BasketContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import Link from 'next/link';

export default function BlandSelvMixProduct() {
  const router = useRouter();
  const { slug } = router.query;

  // State for loading and product data
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // State for package selection
  const [selectedSize, setSelectedSize] = useState('8');
  const [selectedProducts, setSelectedProducts] = useState({});
  const [price, setPrice] = useState(175);
  const [quantity, setQuantity] = useState(1);
  const maxProducts = parseInt(selectedSize);

  const { addItemToBasket } = useBasket();

  useEffect(() => {
    if (!slug) return;

    const fetchProduct = async () => {
      setLoading(true); // Ensure loading is set before fetching data
      const docRef = doc(db, 'packages', slug);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProduct({ id: docSnap.id, ...docSnap.data() });
      } else {
        setProduct(null); // Handle case when product is not found
      }
      setLoading(false); // Set loading to false after data is fetched
    };

    fetchProduct();
  }, [slug]);

  useEffect(() => {
    // Update price when package size changes
    if (selectedSize === '8') {
      setPrice(175);
    } else if (selectedSize === '12') {
      setPrice(220);
    } else if (selectedSize === '18') {
      setPrice(299);
    }
  }, [selectedSize]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!product) {
    return <p>Product not found.</p>;
  }

  // The rest of your logic for managing package selection, quantity, price, and adding to the basket
  const allDrinks = [
    'Red Bull Original - 0.25 l',
    'Red Bull Sugarfree - 0.25 l',
    'Red Bull Zero - 0.25 l',
    'Monster Energy - 0.5 l',
    'Monster Ultra - 0.5 l',
    'Booster Original - 0.5 l',
    'Booster Sugarfree - 0.5 l',
  ];

  const addToBasket = () => {
    const mixedProduct = {
      slug: product.id,
      title: `${product.name} - ${selectedSize} pcs`,
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

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold text-center mb-8">{product.name}</h1>
      <div className="flex flex-col md:flex-row">
        <div className="md:w-1/2">
          <img src={product.image || '/images/placeholder.jpg'} alt={product.name} className="w-full h-auto" />
          <div className="mt-6">
            <h2 className="text-2xl font-bold mb-2">Description</h2>
            <p className="text-lg text-gray-700">{product.description}</p>
          </div>
        </div>
        {/* Right Column for package selection, etc. */}
      </div>
    </div>
  );
}
