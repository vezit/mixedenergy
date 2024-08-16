import React, { useState, useEffect } from 'react';
import Image from 'next/image';

const Header = () => {
  const [basketItemCount, setBasketItemCount] = useState(0);

  useEffect(() => {
    // Fetch basket items from local storage
    const storedBasket = localStorage.getItem('basket');
    if (storedBasket) {
      const basket = JSON.parse(storedBasket);
      setBasketItemCount(basket.length);
    }
  }, []);

  return (
    <header className="flex justify-between items-center p-4 bg-gray-300 shadow">
      <a href="/" className="flex items-center">
        <Image src="/images/winged-fury-energy.jpg" alt="Logo" width={50} height={50} />
        <h1 className="text-3xl font-bold ml-2">Mixed Energy</h1>
      </a>
      <nav className="flex space-x-4">
        {/* Add navigation links here if needed */}
      </nav>
      <div className="flex items-center space-x-4 pr-4">
        {/* Basket Icon SVG */}
        <div className="relative">
          <a href="/basket">
            <img
              src="/icons/basket-icon.svg"
              alt="Basket Icon"
              width="45.76"
              height="46.782"
            />
            {basketItemCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                {basketItemCount}
              </div>
            )}
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;