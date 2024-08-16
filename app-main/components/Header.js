import React from 'react';
import Image from 'next/image';

const Header = () => {
  return (
    <header className="flex justify-between items-center p-4 bg-gray-300 shadow">
      <a href="/" className="flex items-center">
        <Image src="/images/winged-fury-energy.jpg" alt="Logo" width={50} height={50} />
        <h1 className="text-3xl font-bold ml-2">Mixed Energy</h1>
      </a>
      <nav className="flex space-x-4">
        {/* Add navigation links here if needed */}
      </nav>
      <div className="flex items-center space-x-4">
        {/* Basket Icon SVG */}
        <div className="relative">
          <a href="/cart">
            <img
              src="/icons/basket-icon.svg"
              alt="Basket Icon"
              width="45.76"
              height="46.782"
            />
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;
