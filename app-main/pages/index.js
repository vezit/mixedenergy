import { useEffect, useState } from 'react';
import axios from 'axios';

function HomePage() {
  const [message, setMessage] = useState('Loading...');
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [matrix, setMatrix] = useState([]);
  const [matrixSize, setMatrixSize] = useState(3); // Default to 3x3
  const [basket, setBasket] = useState([]);
  const [currentBasketIndex, setCurrentBasketIndex] = useState({ 9: 0, 16: 0, 24: 0 });

  useEffect(() => {
    axios.get('/api/hello')
      .then(response => {
        setMessage(response.data.message);
      })
      .catch(error => {
        console.error('Error fetching the message:', error);
        setMessage('Failed to load message.');
      });

    generateRandomMatrix(3); // Initialize with 3x3 matrix
  }, []);

  const handleAddressChange = async (e) => {
    const value = e.target.value;
    setAddress(value);

    if (value.length > 2) {
      setIsLoading(true);
      try {
        const response = await axios.get(`https://api.dataforsyningen.dk/adresser/autocomplete`, {
          params: {
            q: value,
          },
        });
        setSuggestions(response.data.slice(0, 4)); // Limit suggestions to 4
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setSuggestions([]);
    }
  };

  const energyDrinks = [
    { name: 'Red Bull', color: '#002776' },
    { name: 'Monster Energy', color: '#00FF00' },
    { name: 'Rockstar', color: '#FFD700' },
    { name: 'Burn', color: '#FF4500' },
    { name: 'Relentless', color: '#000000' },
    { name: 'NOS', color: '#FF6F00' },
    { name: 'Effect', color: '#E30613' },
    { name: 'Hell Energy', color: '#FF0000' },
    { name: 'Shark', color: '#0000FF' },
    { name: 'V Energy', color: '#7FFF00' }
  ];

  const generateRandomMatrix = (size) => {
    const newMatrix = [];
    const rows = size === 3 ? 3 : size === 4 ? 4 : 4;
    const cols = size === 3 ? 3 : size === 4 ? 4 : 6;
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < cols; j++) {
        const randomDrink = energyDrinks[Math.floor(Math.random() * energyDrinks.length)];
        row.push(randomDrink.color);
      }
      newMatrix.push(row);
    }
    setMatrix(newMatrix);
  };

  const handleAddToBasket = () => {
    console.log('Adding to basket...');
    setBasket(prevBasket => {
      const newBasket = [...prevBasket, { size: matrixSize, matrix }];
      console.log('New basket:', newBasket);
      return newBasket;
    });
  };

  const handleRemoveFromBasket = (size) => {
    setBasket(prevBasket => {
      const newBasket = [...prevBasket];
      const index = newBasket.findIndex(item => item.size === size);
      if (index !== -1) {
        newBasket.splice(index, 1);
      }
      return newBasket;
    });
  };

  const increaseMatrixSize = () => {
    if (matrixSize === 3) {
      setMatrixSize(4);
      generateRandomMatrix(4);
    } else if (matrixSize === 4) {
      setMatrixSize(6);
      generateRandomMatrix(6);
    }
  };

  const decreaseMatrixSize = () => {
    if (matrixSize === 6) {
      setMatrixSize(4);
      generateRandomMatrix(4);
    } else if (matrixSize === 4) {
      setMatrixSize(3);
      generateRandomMatrix(3);
    }
  };

  const handleGenerateMatrix = () => {
    generateRandomMatrix(matrixSize);
  };

  const calculateBasketCounts = () => {
    const counts = { 9: 0, 16: 0, 24: 0 };
    basket.forEach(item => {
      if (item.size === 3) counts[9]++;
      if (item.size === 4) counts[16]++;
      if (item.size === 6) counts[24]++;
    });
    return counts;
  };

  const basketCounts = calculateBasketCounts();

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div
        className="w-full hidden lg:block"
        style={{
          height: '50vh', // This sets the height to 50% of the viewport height
          backgroundImage: "url('/images/startpage-background.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      ></div>

      <div className="flex flex-wrap justify-center p-4 max-w-screen-xl mx-auto">
        <Link href="/products/mixed-any">
          <a className="flex flex-col w-full md:w-1/2 lg:w-1/4 p-2">
            <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
              <img
                src="/images/chaos-splash-energy.jpg"
                alt="Mixed Any"
                className="w-full h-48 object-cover"
              />
              <div className="p-4 flex-grow">
                <h2 className="text-xl font-bold">Mixed Bland Selv</h2>
                <p className="text-gray-700">Her kan du selv blande</p>
              </div>
            </div>
          </a>
        </Link>

        <Link href="/products/mixed-red-bulls">
          <a className="flex flex-col w-full md:w-1/2 lg:w-1/4 p-2">
            <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
              <img
                src="/images/blazebox-energy.jpg"
                alt="Mixed Red Bulls"
                className="w-full h-48 object-cover"
              />
              <div className="p-4 flex-grow">
                <h2 className="text-xl font-bold">Mixed Red Bulls</h2>
              </div>
            </div>
          </a>
        </Link>

        <Link href="/products/mixed-monsters">
          <a className="flex flex-col w-full md:w-1/2 lg:w-1/4 p-2">
            <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
              <img
                src="/images/monster-surge-energy.jpg"
                alt="Mixed Monsters"
                className="w-full h-48 object-cover"
              />
              <div className="p-4 flex-grow">
                <h2 className="text-xl font-bold">Mixed Monsters</h2>
              </div>
            </div>
          </a>
        </Link>

        <Link href="/products/mixed-booster">
          <a className="flex flex-col w-full md:w-1/2 lg:w-1/4 p-2">
            <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
              <img
                src="/images/booster-attack-energy.jpg"
                alt="Mixed Booster"
                className="w-full h-48 object-cover"
              />
              <div className="p-4 flex-grow">
                <h2 className="text-xl font-bold">Mixed Booster</h2>
              </div>
            </div>
          </a>
        </Link>
      </div>
    </div>
  );
}
