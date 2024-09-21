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

  // Function to randomly pick products based on the selected size
  const getRandomProducts = () => {
    const weightedProducts = allProducts.flatMap(product =>
      Array(product.weight).fill(product.name)
    );

    const randomSelection = [];
    for (let i = 0; i < maxProducts; i++) {
      const randomProduct = weightedProducts[Math.floor(Math.random() * weightedProducts.length)];
      randomSelection.push(randomProduct);
    }

    const productCount = randomSelection.reduce((acc, product) => {
      acc[product] = (acc[product] || 0) + 1;
      return acc;
    }, {});

    console.log('Random Products:', productCount); // DEBUG: Check if random products are selected
    setSelectedProducts(productCount); // Set the products in object format with counts
  };

  const getSukkerfriProducts = () => {
    const sukkerfriProducts = [
      'Red Bull Sukkerfri - 0.25 l',
      'Red Bull Sukkerfri Stor - 0.473 l',
      'Red Bull Zero - 0.25 l',
    ];

    const randomSelection = [];
    for (let i = 0; i < maxProducts; i++) {
      const randomProduct = sukkerfriProducts[Math.floor(Math.random() * sukkerfriProducts.length)];
      randomSelection.push(randomProduct);
    }

    const productCount = randomSelection.reduce((acc, product) => {
      acc[product] = (acc[product] || 0) + 1;
      return acc;
    }, {});

    console.log('Sukkerfri Products:', productCount); // DEBUG: Check if sukkerfri products are selected
    setSelectedProducts(productCount); // Set the products in object format with counts
  };

  const getMedSukkerProducts = () => {
    const medSukkerProducts = [
      'Red Bull Original - 0.25 l',
      'Red Bull Original Stor - 0.355 l',
      'Red Bull Red Edition Vandmelon - 0.25 l',
      'Red Bull Blue Edition - 0.25 l',
      'Red Bull Abrikos Edition - 0.25 l',
      'Red Bull Lilla Edition - 0.25 l',
      'Red Bull Summer Edition - 0.25 l',
    ];

    const randomSelection = [];
    for (let i = 0; i < maxProducts; i++) {
      const randomProduct = medSukkerProducts[Math.floor(Math.random() * medSukkerProducts.length)];
      randomSelection.push(randomProduct);
    }

    const productCount = randomSelection.reduce((acc, product) => {
      acc[product] = (acc[product] || 0) + 1;
      return acc;
    }, {});

    console.log('Med Sukker Products:', productCount); // DEBUG: Check if med sukker products are selected
    setSelectedProducts(productCount); // Set the products in object format with counts
  };

  const incrementProduct = (productName) => {
    setSelectedProducts((prev) => ({
      ...prev,
      [productName]: (prev[productName] || 0) + 1,
    }));
  };

  const decrementProduct = (productName) => {
    setSelectedProducts((prev) => {
      if (prev[productName] > 1) {
        return {
          ...prev,
          [productName]: prev[productName] - 1,
        };
      }
      const { [productName]: _, ...rest } = prev;
      return rest;
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

  // Check if the current slug corresponds to the specific routes that should display the random buttons
  const isRandomButtonPage = [
    'mixed-any',
    'mixed-red-bulls',
    'mixed-monsters',
    'mixed-booster',
  ].includes(slug);

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

          {/* Show random buttons only for specific links */}
          {isRandomButtonPage && (
            <div>
              <button
                onClick={getRandomProducts}
                className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-full shadow hover:bg-blue-600 transition w-full md:w-auto"
              >
                Alle Varianter
              </button>

              <button
                onClick={getSukkerfriProducts}
                className="mt-4 bg-green-500 text-white px-6 py-2 rounded-full shadow hover:bg-green-600 transition w-full md:w-auto"
              >
                Kun Sukkerfri Varianter
              </button>

              <button
                onClick={getMedSukkerProducts}
                className="mt-4 bg-orange-500 text-white px-6 py-2 rounded-full shadow hover:bg-orange-600 transition w-full md:w-auto"
              >
                Med Sukker
              </button>
            </div>
          )}

          {/* Manual product selection for other pages */}
          {!isRandomButtonPage && (
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
