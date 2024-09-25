import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useBasket } from '../lib/BasketContext';
import { useRouter } from 'next/router';

const Header = ({ isLoggedIn }) => {
    const { basketItems, isNewItemAdded, setIsNewItemAdded } = useBasket();
    const [showEmptyMessage, setShowEmptyMessage] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (isNewItemAdded) {
            const timer = setTimeout(() => setIsNewItemAdded(false), 2400);
            return () => clearTimeout(timer);
        }
    }, [isNewItemAdded, setIsNewItemAdded]);

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
            e.preventDefault();
        }
    };

    const handleLogout = async () => {
        await fetch('/api/sessionLogout', {
            method: 'POST',
        });
        router.push('/admin/login'); // Redirect to admin login on logout
    };

    return (
        <header className="flex justify-between items-center p-4 shadow" style={{ backgroundColor: '#fab93d' }}>
            <a href="/" className="flex items-center">
                <Image src="/images/mixedenergy-logo.png" alt="Logo" width={50} height={50} />
                <h1 className="text-3xl font-bold ml-2">Mixed Energy</h1>
            </a>
            <nav className="flex space-x-4"></nav>
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
                            <div
                                className={`absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 flex items-center justify-center ${
                                    isNewItemAdded ? 'animate-custom-pulse' : ''
                                }`}
                            />
                        )}
                    </a>
                    {showEmptyMessage && (
                        <div className="absolute top-full mt-1 -left-24 bg-black text-white text-xs rounded p-2 shadow-lg">
                            Din indkøbskurv er tom
                        </div>
                    )}
                </div>

                {isLoggedIn && (
                    <button
                        onClick={handleLogout}
                        className="bg-transparent border-2 border-black rounded px-4 py-1 hover:bg-black hover:text-white transition-all"
                    >
                        Logout
                    </button>
                )}
            </div>
        </header>
    );
};

export default Header;
