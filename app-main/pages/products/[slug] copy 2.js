import { useRouter } from 'next/router';
import Image from 'next/image';
import { useState } from 'react';
import { useBasket } from '../../lib/BasketContext';
import products from '../../lib/products'; // Import the products data
import Link from 'next/link';

export default function ProductDetail() {
  const router = useRouter();
  const { slug } = router.query;
  const product = products[slug];
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('8'); // New state for radio buttons
  const { addItemToBasket } = useBasket();

  if (!product) {
    return <p>Loading...</p>;
  }

  const addToBasket = () => {
    const newProduct = { ...product, quantity, selectedSize };
    addItemToBasket(newProduct);
    // Removed the redirection to the basket page
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-8">
      <h1 className="text-4xl font-bold mb-8">{product.title}</h1>
      <Image
        src={product.image}
        alt={product.title}
        width={400}
        height={400}
        className="rounded-lg shadow-lg"
      />
      <p className="text-xl text-gray-700 mt-4">{product.description}</p>
      <p className="text-2xl font-bold mt-4">${product.price}</p>
      <div className="mt-4">
        <button onClick={() => setQuantity(quantity - 1)} disabled={quantity <= 1} className="px-4 py-2 bg-gray-200 rounded-l">
          -
        </button>
        <span className="px-4 py-2 bg-gray-100">{quantity}</span>
        <button onClick={() => setQuantity(quantity + 1)} className="px-4 py-2 bg-gray-200 rounded-r">
          +
        </button>
      </div>

      {/* Radio buttons for selecting the size */}
      <div className="mt-4">
        <p>Select size:</p>
        <label className="mr-4">
          <input
            type="radio"
            name="size"
            value="8"
            checked={selectedSize === '8'}
            onChange={() => setSelectedSize('8')}
          />
          8
        </label>
        <label className="mr-4">
          <input
            type="radio"
            name="size"
            value="12"
            checked={selectedSize === '12'}
            onChange={() => setSelectedSize('12')}
          />
          12
        </label>
        <label>
          <input
            type="radio"
            name="size"
            value="18"
            checked={selectedSize === '18'}
            onChange={() => setSelectedSize('18')}
          />
          18
        </label>
      </div>

      <button onClick={addToBasket} className="mt-6 bg-red-500 text-white px-6 py-2 rounded-full shadow hover:bg-red-600 transition">
        Add to Cart
      </button>

      {/* Add a link to the drinks page */}
      <Link href="/drinks">
        <a className="mt-4 text-blue-500 hover:underline">
          List of drinks
        </a>
      </Link>
    </div>
  );
}
