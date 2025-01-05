import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useBasket } from './BasketContext';

// Example interface for a basket item. Adjust as needed.
interface IBasketItem {
  image: string;
  title: string;
  quantity: number;
  // Add other fields (id, price, etc.) if needed
}

const AddToBasketPopup: React.FC = () => {
  // Now that we added isNewItemAdded and setIsNewItemAdded to the BasketContextValue,
  // we can safely destructure them without any TypeScript errors:
  const { isNewItemAdded, setIsNewItemAdded, basketItems } = useBasket();

  const router = useRouter();

  // This ref will point to the popup's container element
  const popupRef = useRef<HTMLDivElement>(null);

  // Add/remove a DOM event listener whenever `isNewItemAdded` changes
  useEffect(() => {
    if (isNewItemAdded) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    // Cleanup: remove the listener on unmount or if isNewItemAdded changes
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNewItemAdded]);

  // Close popup if clicking outside the popup container
  const handleClickOutside = (event: MouseEvent) => {
    if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
      setIsNewItemAdded(false);
    }
  };

  const handleClose = () => {
    setIsNewItemAdded(false);
  };

  const handleGoToBasket = () => {
    setIsNewItemAdded(false);
    router.push('/basket');
  };

  // Get the last added item
  const lastItem = basketItems.length > 0 ? basketItems[basketItems.length - 1] : null;

  // Only render popup if a new item was added AND we have a last item
  if (!isNewItemAdded || !lastItem) {
    return null;
  }

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
          <img
            src={lastItem.image}
            alt={lastItem.title}
            className="w-16 h-16 mr-4"
          />
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
