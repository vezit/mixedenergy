// components/BasketContext.js

import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const BasketContext = createContext();

export const BasketProvider = ({ children }) => {
  const [basketItems, setBasketItems] = useState([]);
  const [isBasketLoaded, setIsBasketLoaded] = useState(false); // New state to track loading
  const [customerDetails, setCustomerDetails] = useState({
    customerType: 'Privat',
    fullName: '',
    mobileNumber: '',
    email: '',
    address: '',
    postalCode: '',
    city: '',
  });

  const fetchBasketItems = async () => {
    try {
      const response = await axios.get('/api/firebase/1-getSession');
      console.log('Response from getSession:', response.data);
      const { basketDetails } = response.data.session || {};
      const items = basketDetails && basketDetails.items;
      if (Array.isArray(items)) {
        setBasketItems(items);
      } else {
        setBasketItems([]);
      }
    } catch (error) {
      console.error('Error fetching basket items:', error);
    } finally {
      setIsBasketLoaded(true); // Indicate that loading has completed
    }
  };

  useEffect(() => {
    fetchBasketItems();
  }, []);

  const addItemToBasket = async ({ selectionId, quantity }) => {
    try {
      const response = await axios.post('/api/firebase/4-updateBasket', {
        action: 'addItem',
        selectionId,
        quantity,
      });
      if (response.data.success) {
        await fetchBasketItems();
      } else {
        console.error('Failed to add item to basket:', response.data);
        alert('Failed to add item to basket: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding item to basket:', error);
      if (error.response) {
        console.error('Server responded with:', error.response.data);
        alert('Error adding item to basket: ' + (error.response.data.error || error.message));
      } else {
        alert('Error adding item to basket: ' + error.message);
      }
    }
  };

  const removeItemFromBasket = async (index) => {
    try {
      const response = await axios.post('/api/firebase/4-updateBasket', {
        action: 'removeItem',
        itemIndex: index,
      });
      if (response.data.success) {
        // Update local state immediately
        setBasketItems((prevItems) => {
          const newItems = [...prevItems];
          newItems.splice(index, 1);
          return newItems;
        });
      } else {
        console.error('Failed to remove item from basket:', response.data);
      }
    } catch (error) {
      console.error('Error removing item from basket:', error);
    }
  };

  const updateItemQuantity = async (index, newQuantity) => {
    if (newQuantity < 1) {
      return; // Do nothing if quantity is less than 1
    }
    try {
      const response = await axios.post('/api/firebase/4-updateBasket', {
        action: 'updateQuantity',
        itemIndex: index,
        quantity: newQuantity,
      });
      if (response.data.success) {
        // Update local state immediately
        setBasketItems((prevItems) => {
          const newItems = [...prevItems];
          newItems[index].quantity = newQuantity;
          // Also update totalPrice and totalRecyclingFee if needed
          newItems[index].totalPrice = newItems[index].pricePerPackage * newQuantity;
          newItems[index].totalRecyclingFee =
            newItems[index].recyclingFeePerPackage * newQuantity;
          return newItems;
        });
      } else {
        console.error('Failed to update item quantity:', response.data);
      }
    } catch (error) {
      console.error('Error updating item quantity:', error);
    }
  };

  const updateCustomerDetails = async (updatedDetails) => {
    setCustomerDetails(updatedDetails);

    // Update customer details on the server
    try {
      const response = await axios.post('/api/updateCustomerDetails', {
        customerDetails: updatedDetails,
      });
      if (!response.data.success) {
        console.error('Failed to update customer details:', response.data);
      }
    } catch (error) {
      console.error('Error updating customer details:', error);
    }
  };

  return (
    <BasketContext.Provider
      value={{
        basketItems,
        isBasketLoaded, // Expose isBasketLoaded
        addItemToBasket,
        removeItemFromBasket,
        customerDetails,
        updateCustomerDetails,
        updateItemQuantity,
      }}
    >
      {children}
    </BasketContext.Provider>
  );
};

export const useBasket = () => useContext(BasketContext);
