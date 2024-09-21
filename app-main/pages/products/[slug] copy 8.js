import { useRouter } from 'next/router';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useBasket } from '../../lib/BasketContext';
import products from '../../lib/products';
import Link from 'next/link';

export default function ProductDetail() {
  const router = useRouter();
  const { slug } = router.query;
  const product = products[slug];
  const [selectedSize, setSelectedSize] = useState('8');
  const [selectedProducts, setSelectedProducts] = useState({});
  const [price, setPrice] = useState(175);
  const { addItemToBasket } = useBasket();

  const allProducts = [
    { name: 'Red Bull Original - 0.25 l', weight: 5 },
    { name: 'Red Bull Sukkerfri - 0.25 l', weight: 5 },
    { name: 'Red Bull Zero - 0.25 l', weight: 3 },
    { name: 'Red Bull Original Stor - 0.355 l', weight: 3 },
    { name: 'Red Bull Sukkerfri Stor - 0.473 l', weight: 3 },
    { name: 'Red Bull Red Edition Vandmelon - 0.25 l', weight: 2 },
    { name: 'Red Bull Blue Edition - 0.25 l', weight: 2 },
    { name: 'Red Bull Abrikos Edition - 0.25 l', weight: 1 },
    { name: 'Red Bull Lilla Edition - 0.25 l', weight: 1 },
    { name: 'Red Bull Summer Edition - 0.25 l', weight: 1 },
  ];

  const maxProducts = selectedSize === '8' ? 8 : selectedSize === '12' ? 12 : 18;

  useEffect(() => {
    if (selectedSize === '8') {
      setPrice(175);
    } else if (selectedSize === '12') {
      setPrice(220);
    } else if (selectedSize === '18') {
      setPrice(299);
    }
  }, [selectedSize]);

  if (!product) {
    return <p>Indlæser...</p>;
  }

  const handleRandomSelection = () => {
    const weightedProducts = allProducts.flatMap(product =>
      Array(product.weight).fill(product.name)
    );

    const randomSelection = [];
    for (let i = 0; i < maxProducts; i++) {
      const randomProduct = weightedProducts[Math.floor(Math.random() * weightedProducts.length)];
      randomSelection.push(randomProduct);
    }
    setSelectedProducts(randomSelection);
  };

  const incrementProduct = (productName) => {
    setSelectedProducts((prevState) => {
      const currentCount = prevState[productName] || 0;
      if (Object.values(prevState).reduce((a, b) => a + b, 0) < maxProducts) {
        return { ...prevState, [productName]: currentCount + 1 };
      }
      return prevState;
    });
  };

  const decrementProduct = (productName) => {
    setSelectedProducts((prevState) => {
      const currentCount = prevState[productName] || 0;
      if (currentCount > 0) {
        return { ...prevState, [productName]: currentCount - 1 };
      }
      return prevState;
    });
  };

  const addMixedToBasket = () => {
    const totalSelected = Object.values(selectedProducts).reduce((a, b) => a + b, 0);
    if (totalSelected !== maxProducts) {
      alert(`Vælg præcis ${maxProducts} produkter.`);
      return;
    }

    const mixedProduct = {
      title: `Blandet - Størrelse ${selectedSize}`,
      description: `En blanding af følgende produkter: ${Object.entries(selectedProducts)
        .filter(([_, count]) => count > 0)
        .map(([name, count]) => `${count} x ${name}`)
        .join(', ')}`,
      price,
      selectedSize,
      selectedProducts,
    };

    addItemToBasket(mixedProduct);
  };

  // Check if the slug ends with "mix"
  const isMixPage = slug && slug.endsWith('mix');

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4 md:p-8">
      <h1 className="text-3xl md:text-5xl font-bold text-center mb-4 md:mb-8">Blandet Produkter</h1>

      <div className="flex flex-col md:flex-row items-start justify-center w-full max-w-4xl gap-8">
        <div className="w-full md:w-auto flex-shrink-0">
          <div className="w-full md:w-[500px]">
            <Image
              src={product.image}
              alt={product.title}
              width={500}
              height={500}
              className="rounded-lg shadow-lg"
            />
          </div>
        </div>

        <div className="flex-grow w-full">
          <div className="mt-4 md:mt-0">
            <p>Vælg størrelse:</p>
            <label className="mr-2">
              <input
                type="radio"
                name="size"
                value="8"
                checked={selectedSize === '8'}
                onChange={() => setSelectedSize('8')}
              />
              8
            </label>
            <label className="mr-2">
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

          {/* Render auto-generate buttons only for old links without "mix" */}
          {!isMixPage && (
            <div>
              <button
                onClick={handleRandomSelection}
                className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-full shadow hover:bg-blue-600 transition w-full md:w-auto"
              >
                Alle Varianter
              </button>
              <button
                onClick={handleRandomSelection} // Replace with specific logic for "sukkerfri" if needed
                className="mt-4 bg-green-500 text-white px-6 py-2 rounded-full shadow hover:bg-green-600 transition w-full md:w-auto"
              >
                Kun Sukkerfri Varianter
              </button>
              <button
                onClick={handleRandomSelection} // Replace with specific logic for "med sukker" if needed
                className="mt-4 bg-orange-500 text-white px-6 py-2 rounded-full shadow hover:bg-orange-600 transition w-full md:w-auto"
              >
                Med Sukker
              </button>
            </div>
          )}

          {/* Product list with + and - buttons for "mix" pages */}
          {isMixPage && (
            <div className="mt-4">
              <p>Vælg dine produkter:</p>
              <ul>
                {allProducts.map((product, index) => (
                  <li key={index} className="flex items-center justify-between mt-2">
                    <span>{product.name}</span>
                    <div className="flex items-center">
                      <button
                        onClick={() => decrementProduct(product.name)}
                        className="px-3 py-1 bg-gray-300 rounded"
                      >
                        -
                      </button>
                      <span className="mx-2">{selectedProducts[product.name] || 0}</span>
                      <button
                        onClick={() => incrementProduct(product.name)}
                        className="px-3 py-1 bg-gray-300 rounded"
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={addMixedToBasket}
            className="mt-6 bg-red-500 text-white px-6 py-2 rounded-full shadow hover:bg-red-600 transition w-full md:w-auto"
          >
            Tilføj blandet til kurv
          </button>

          <p className="text-2xl font-bold mt-4">{price} kr</p>

          <Link href="/drinks">
            <a className="mt-4 text-blue-500 hover:underline">Liste over drikkevarer</a>
          </Link>
        </div>
      </div>
    </div>
  );
}
