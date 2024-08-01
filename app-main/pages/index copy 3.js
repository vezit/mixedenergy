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

  const handleBasketSlider = (size, direction) => {
    setCurrentBasketIndex(prevState => {
      const newIndex = prevState[size] + direction;
      const sizeCount = basket.filter(item => item.size === size).length;
      return {
        ...prevState,
        [size]: (newIndex + sizeCount) % sizeCount
      };
    });
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gradient-to-r from-blue-200 to-blue-500">
      <div className="p-8 bg-white rounded-lg shadow-lg max-w-sm w-full">
        <h1 className="text-4xl font-bold text-blue-900 mb-4">Welcome!</h1>
        <button className="mt-4 bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition duration-300">
          Get Started
        </button>

        <div className="mt-4">
          <h2 className="text-2xl font-bold text-blue-900 mb-2">Energy Drinks:</h2>
          <ul>
            {energyDrinks.map((drink, index) => (
              <li key={index} className="flex items-center mb-2">
                <span
                  className="w-4 h-4 mr-2 rounded-full"
                  style={{ backgroundColor: drink.color }}
                ></span>
                <span>{drink.name}</span>
              </li>
            ))}
          </ul>
        </div>



        <div className="mt-4">
          <h2 className="text-2xl font-bold text-blue-900 mb-2">Random Energy Drink Matrix:</h2>
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={decreaseMatrixSize}
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition duration-300"
              disabled={matrixSize === 3}
            >
              -
            </button>
            <span className="text-blue-900 font-bold text-xl">
              {matrixSize === 3 ? "Box of 9" : matrixSize === 4 ? "Box of 16" : "Box of 24"}
            </span>
            <button
              onClick={increaseMatrixSize}
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition duration-300"
              disabled={matrixSize === 6}
            >
              +
            </button>
          </div>
          <div className={`grid gap-1 ${matrixSize === 6 ? 'grid-cols-6' : matrixSize === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {matrix.map((row, rowIndex) =>
              row.map((color, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="w-8 h-8"
                  style={{ backgroundColor: color }}
                ></div>
              ))
            )}
          </div>
          <button
            onClick={handleGenerateMatrix}
            className="mt-4 bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition duration-300"
          >
            Generate Matrix
          </button>
          <button
            onClick={handleAddToBasket}
            className="mt-4 bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition duration-300"
          >
            Add to Basket
          </button>
        </div>

        <div className="mt-4">
          <h2 className="text-2xl font-bold text-blue-900 mb-2">Basket:</h2>
          {[9, 16, 24].map(size => {
            const sizeBasket = basket.filter(item => item.size === size / 4 * 4);
            console.log(`Size Basket for ${size}:`, sizeBasket); // Add this line
            if (sizeBasket.length > 0) {
              const currentIndex = currentBasketIndex[size];
              console.log(`Current index for ${size}:`, currentIndex); // Add this line
              return (
                <div key={size} className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <button
                      onClick={() => handleBasketSlider(size, -1)}
                      className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition duration-300"
                      disabled={sizeBasket.length <= 1}
                    >
                      -
                    </button>
                    <span className="text-blue-900 font-bold text-xl">
                      {size === 9 ? "Box of 9" : size === 16 ? "Box of 16" : "Box of 24"}
                    </span>
                    <button
                      onClick={() => handleBasketSlider(size, 1)}
                      className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition duration-300"
                      disabled={sizeBasket.length <= 1}
                    >
                      +
                    </button>
                  </div>
                  <div className={`grid gap-1 ${size === 24 ? 'grid-cols-6' : size === 16 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                    {sizeBasket[currentIndex]?.matrix.map((row, rowIndex) =>
                      row.map((color, colIndex) => (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className="w-8 h-8"
                          style={{ backgroundColor: color }}
                        ></div>
                      ))
                    )}
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>


        <div className="mt-4">
          <h2 className="text-2xl font-bold text-blue-900 mb-2">Address Autocomplete:</h2>
          <input
            type="text"
            value={address}
            onChange={handleAddressChange}
            placeholder="Start typing your address..."
            className="w-full p-2 border border-blue-300 rounded"
          />
          {isLoading && <p>Loading suggestions...</p>}
          <ul className="mt-2 border border-blue-300 rounded max-h-32 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                className="p-2 hover:bg-blue-100 cursor-pointer"
                onClick={() => setAddress(suggestion.tekst)}
              >
                {suggestion.tekst}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
