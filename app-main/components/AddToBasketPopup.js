// components/AddToBasketPopup.js
import React, { useEffect, useRef } from 'react';
import { useBasket } from './BasketContext';
import { useRouter } from 'next/router';

const AddToBasketPopup = () => {
  const { isNewItemAdded, setIsNewItemAdded, basketItems } = useBasket();
  const router = useRouter();
  const popupRef = useRef(null);

  // Hooks must be called unconditionally
  useEffect(() => {
    if (isNewItemAdded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNewItemAdded]);

  const handleClickOutside = (event) => {
    if (popupRef.current && !popupRef.current.contains(event.target)) {
      setIsNewItemAdded(false);
    }
  };

  // Functions can be defined after hooks
  const handleClose = () => {
    setIsNewItemAdded(false);
  };

  const handleGoToBasket = () => {
    setIsNewItemAdded(false);
    router.push('/basket');
  };

  const handleViewDetails = () => {
    setIsNewItemAdded(false);
    if (lastItem && lastItem.slug) {
      // Adjust the route according to your product detail page
      router.push(`/products/bland-selv-mix/${lastItem.slug}`);
    }
  };

  // Get the last added item
  const lastItem = basketItems.length > 0 ? basketItems[basketItems.length - 1] : null;

  // Conditional rendering can occur after hooks
  if (!isNewItemAdded || !lastItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={popupRef}
        className="bg-white p-6 rounded shadow-lg max-w-md w-full relative"
      >
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          &times;
        </button>
        <h2 className="text-xl font-bold mb-4">Varen er lagt i kurven</h2>
        <div className="flex items-center mb-4">
          <img src={lastItem.image} alt={lastItem.title} className="w-16 h-16 mr-4" />
          <div>
            <p className="font-semibold">{lastItem.title}</p>
            <p>{lastItem.quantity} stk.</p>
          </div>
        </div>
        <div className="flex justify-between">
          <button
            onClick={handleClose}
            className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
          >
            Køb Mere
          </button>
          <button
            onClick={handleViewDetails}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Details
          </button>
          <button
            onClick={handleGoToBasket}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Gå til kassen
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddToBasketPopup;
