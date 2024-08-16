import React, { useState } from 'react';
import Image from 'next/image';
import { useBasket } from '../lib/BasketContext';

const Header = () => {
    const { basketItems } = useBasket();
    const [showEmptyMessage, setShowEmptyMessage] = useState(false);

    const handleMouseEnter = () => {
        if (basketItems.length === 0) {
            setShowEmptyMessage(true);
        }
    };

    const handleMouseLeave = () => {
        setShowEmptyMessage(false);
    };

    const handleBasketClick = (e) => {
        if (basketItems.length === 0) {
            e.preventDefault(); // Prevent navigation if the basket is empty
        }
    };

    return (
        <header className="flex justify-between items-center p-4 bg-gray-300 shadow">
            <a href="/" className="flex items-center">
                <Image src="/images/winged-fury-energy.jpg" alt="Logo" width={50} height={50} />
                <h1 className="text-3xl font-bold ml-2">Mixed Energy</h1>
            </a>
            <nav className="flex space-x-4">
                {/* Add navigation links here if needed */}
            </nav>
            <div className="relative flex items-center space-x-4">
                <div
                    className="relative"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <a href="/basket" onClick={handleBasketClick}>
                        <img
                            src="/icons/basket-icon.svg"
                            alt="Basket Icon"
                            width="45.76"
                            height="46.782"
                        />
                        {basketItems.length > 0 && (
                            <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                                {basketItems.length}
                            </div>
                        )}
                    </a>
                    {showEmptyMessage && (
                        <div className="absolute top-full mt-1 -left-24 bg-black text-white text-xs rounded p-2 shadow-lg">
                            Din indkøbskurv er tom
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
