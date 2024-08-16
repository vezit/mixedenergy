// components/Header.js

import React from 'react';
import Image from 'next/image';

const Header = () => {
  return (
    <header className="flex justify-between items-center p-4 bg-gray-100 shadow">
      <div className="flex items-center">
        <Image src="/images/monster_logo.png" alt="Logo" width={50} height={50} />
        <h1 className="text-3xl font-bold ml-2">Mixed Energy</h1>
      </div>
      <nav className="flex space-x-4">
        <a href="/" className="text-gray-700 font-semibold hover:underline">Home</a>
        <a href="/handelsbetingelser" className="text-gray-700 font-semibold hover:underline">Handelsbetingelser</a>
        <a href="#monster" className="text-gray-700 font-semibold hover:underline">Monster Box</a>
        <a href="#booster" className="text-gray-700 font-semibold hover:underline">Booster Box</a>
        <a href="#mix" className="text-gray-700 font-semibold hover:underline">Mix Box</a>
        <a href="#redbull" className="text-gray-700 font-semibold hover:underline">Red Bull Box</a>
      </nav>
      <div className="text-lg font-semibold">Ting Ting Om Kurv</div>
    </header>
  );
};

export default Header;
