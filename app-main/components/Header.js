import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useBasket } from '../components/BasketContext';
import { useRouter } from 'next/router';
import { getAuth, onAuthStateChanged } from 'firebase/auth'; // Firebase Auth methods

const Header = () => {
    const { basketItems, isNewItemAdded, setIsNewItemAdded } = useBasket();
    const [showEmptyMessage, setShowEmptyMessage] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false); // state to track if user is logged in
    const [authLoading, setAuthLoading] = useState(true); // state to track if auth state is loading
    const [username, setUsername] = useState(''); // state to store the user's username
    const router = useRouter();

    useEffect(() => {
        // Check if user is authenticated using Firebase's onAuthStateChanged
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setIsLoggedIn(true); // User is logged in
                // Set the user's displayName or email if available
                setUsername(user.displayName || user.email); // fallback to email if displayName is not set
            } else {
                setIsLoggedIn(false); // User is not logged in
                setUsername(''); // Clear username if not logged in
            }
            setAuthLoading(false); // Stop loading after check
        });
        return () => unsubscribe(); // Clean up the listener on unmount
    }, []);

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
        const auth = getAuth();
        await fetch('/api/sessionLogout', { method: 'POST' });
        await auth.signOut(); // Sign out of Firebase Auth
        router.push('/'); // Redirect to login after logout
      };
      

    if (authLoading) {
        return null; // Don't render the header until auth state is determined
    }

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

                {/* Conditionally render the logout button only if logged in */}
                {isLoggedIn && (
                    <button
                        onClick={handleLogout}
                        className="bg-transparent border-2 border-black rounded px-4 py-1 hover:bg-black hover:text-white transition-all"
                    >
                        Logout {username}
                    </button>
                )}
            </div>
        </header>
    );
};

export default Header;
