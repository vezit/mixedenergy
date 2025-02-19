import React, { useState, useEffect, MouseEvent } from 'react';
import Image from 'next/image';
import { useBasket } from '../components/BasketContext';
import { useRouter } from 'next/router';
import axios from 'axios';

interface BasketItem {
  quantity: number;
  slug: string;
}

const Header: React.FC = () => {
  // 1) We read `basketItems` from our new BasketContext
  const { basketItems } = useBasket();

  const [showEmptyMessage, setShowEmptyMessage] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const router = useRouter();

  // [Optional] Example of a "checkAuth" call if needed
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // If you have an auth route, do so here:
        // const response = await axios.get('/api/supabase/checkAuth');
        // if (response.data.loggedIn) {
        //   setIsLoggedIn(true);
        //   setUsername(response.data.email);
        // }
        setIsLoggedIn(false);
        setUsername('');
      } catch (error) {
        console.error('Error checking auth status:', error);
        setIsLoggedIn(false);
        setUsername('');
      }
    };
    void checkAuth();
  }, []);

  /**
   * 2) If basket is empty, show "Din indkøbskurv er tom" on hover
   */
  const handleMouseEnter = () => {
    if (basketItems.length === 0) {
      setShowEmptyMessage(true);
    }
  };

  const handleMouseLeave = () => {
    setShowEmptyMessage(false);
  };

  /**
   * 3) Prevent navigation if basket is empty
   */
  const handleBasketClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (basketItems.length === 0) {
      e.preventDefault();
    }
  };

  /**
   * 4) (Optional) handleLogout
   */
  const handleLogout = async () => {
    try {
      await axios.post('/api/sessionLogout');
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  /**
   * 5) totalItemsInBasket
   */
  const totalItemsInBasket = basketItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header
      className="flex justify-between items-center p-4 shadow"
      style={{ backgroundColor: '#fab93d' }}
    >
      {/* Logo/title */}
      <a href="/" className="flex items-center">
        <Image
          src="/images/mixedenergy-logo.png"
          alt="Logo"
          width={50}
          height={50}
        />
        <h1 className="text-3xl font-bold ml-2">Mixed Energy</h1>
      </a>

      <nav className="flex space-x-4">
        {/* (Add your nav links if needed) */}
      </nav>

      <div className="relative flex items-center space-x-4">
        {/* Basket icon */}
        <div
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <a href="/basket" onClick={handleBasketClick}>
            <img
              src="/icons/basket-icon.svg"
              alt="Basket Icon"
              width={45}
              height={46}
            />
            {totalItemsInBasket > 0 && (
              <div
                className="absolute -top-2 -right-2 bg-red-500 text-white
                  rounded-full w-6 h-6 flex items-center justify-center
                  text-xs font-semibold"
              >
                {totalItemsInBasket}
              </div>
            )}
          </a>
          {showEmptyMessage && (
            <div className="absolute top-full mt-1 -left-24 bg-black text-white text-xs rounded p-2 shadow-lg">
              Din indkøbskurv er tom
            </div>
          )}
        </div>

        {/* If user is logged in, show logout */}
        {isLoggedIn && (
          <button
            onClick={handleLogout}
            className="bg-transparent border-2 border-black rounded px-4 py-1
              hover:bg-black hover:text-white transition-all"
          >
            Logout {username}
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
