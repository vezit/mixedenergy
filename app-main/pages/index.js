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
    <div className="flex flex-col min-h-screen">
      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-gray-100 shadow">
        <div className="flex items-center">
          <Image src="/images/monster_logo.png" alt="Logo" width={50} height={50} />
          <h1 className="text-3xl font-bold ml-2">Mixed Energy</h1>
        </div>
        <nav className="flex space-x-4">
          <a href="#monster" className="text-gray-700 font-semibold hover:underline">Monster Box</a>
          <a href="#booster" className="text-gray-700 font-semibold hover:underline">Booster Box</a>
          <a href="#mix" className="text-gray-700 font-semibold hover:underline">Mix Box</a>
          <a href="#redbull" className="text-gray-700 font-semibold hover:underline">Red Bull Box</a>
        </nav>
        <div className="text-lg font-semibold">Ting Ting Om Kurv</div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-8">
        <section className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-4">Mixed Energy Bokse</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div id="monster" className="text-center">
              <Image src="/images/monster-surge-energy.jpg" alt="Monster Box" width={200} height={200} />
              <h3 className="text-xl font-bold mt-2">Monster Box</h3>
            </div>
            <div id="booster" className="text-center">
              <Image src="/images/booster-attack-energy.jpg" alt="Booster Box" width={200} height={200} />
              <h3 className="text-xl font-bold mt-2">Booster Box</h3>
            </div>
            <div id="mix" className="text-center">
              <Image src="/images/blaze-fury-energy.jpg" alt="Mix Box" width={200} height={200} />
              <h3 className="text-xl font-bold mt-2">Mix Box</h3>
            </div>
            <div id="redbull" className="text-center">
              <Image src="/images/redwave-energy.jpg" alt="Red Bull Box" width={200} height={200} />
              <h3 className="text-xl font-bold mt-2">Red Bull Box</h3>
            </div>
          </div>
        </section>

        <section className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-4">Populære Bokse</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="text-center">
              <Image src="/images/chaos-splash-energy.jpg" alt="Monster 8 Bland Selv" width={200} height={200} />
              <h3 className="text-xl font-bold mt-2">Monster 8 Bland Selv</h3>
            </div>
            <div className="text-center">
              <Image src="/images/thunder-punch-energy.jpg" alt="Mix 8 Bland Selv" width={200} height={200} />
              <h3 className="text-xl font-bold mt-2">Mix 8 Bland Selv</h3>
            </div>
            <div className="text-center">
              <Image src="/images/winged-fury-energy.jpg" alt="Red Bull 8 Bland Selv" width={200} height={200} />
              <h3 className="text-xl font-bold mt-2">Red Bull 8 Bland Selv</h3>
            </div>
          </div>
        </section>

        <section className="text-center">
          <h2 className="text-xl font-bold mb-4">Mest Populære Mærker eller Nye Smags Varianter?</h2>
          <div className="flex justify-center space-x-8">
            <Image src="/images/redbull_logo.png" alt="Red Bull" width={100} height={50} />
            <Image src="/images/monster_logo.png" alt="Monster Energy" width={100} height={50} />
            <Image src="/images/booster_logo_transparent.png" alt="Booster" width={100} height={50} />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="p-4 bg-gray-200 text-center text-gray-600 mt-auto">
        <div className="flex justify-between text-sm">
          <div>
            <p>Information</p>
            <p>Handelsbetingelser</p>
            <p>Min Konto</p>
          </div>
          <div>
            <p>MixedEnergy</p>
            <p>Bagværds Hovedgade 141, 2800 Bagsværd</p>
            <p>CVR: 40493032</p>
            <p>info@mixedenergy.dk</p>
          </div>
          <div>
            <p>Sociale Medier</p>
            <p>(links)</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
