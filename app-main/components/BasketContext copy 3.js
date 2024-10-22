// components/BasketContext.js

import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { getCookie } from '../lib/cookies';

const BasketContext = createContext();

export const BasketProvider = ({ children }) => {
  const [basketItems, setBasketItems] = useState([]);
  const [customerDetails, setCustomerDetails] = useState({
    customerType: 'Privat',
    fullName: '',
    mobileNumber: '',
    email: '',
    address: '',
    postalCode: '',
    city: '',
    country: 'Danmark',
    streetNumber: '',
  });
  const [isNewItemAdded, setIsNewItemAdded] = useState(false);

  useEffect(() => {
    const consentId = getCookie('cookie_consent_id');

    if (consentId) {
      // Fetch basket data from API
      axios
        .get('/api/getBasket', { params: { consentId } })
        .then((response) => {
          const { basketItems, customerDetails } = response.data;
          if (basketItems) {
            setBasketItems(basketItems);
          }
          if (customerDetails) {
            setCustomerDetails(customerDetails);
          }
        })
        .catch((error) => {
          console.error('Error fetching basket:', error);
        });
    }
  }, []);

  // Helper function to compare selected products
  const isSameSelection = (a, b) => {
    const aEntries = Object.entries(a).sort();
    const bEntries = Object.entries(b).sort();
    return JSON.stringify(aEntries) === JSON.stringify(bEntries);
  };

  const addItemToBasket = async (item) => {
    const existingItemIndex = basketItems.findIndex(
      (basketItem) =>
        basketItem.slug === item.slug &&
        basketItem.selectedSize === item.selectedSize &&
        isSameSelection(basketItem.selectedProducts, item.selectedProducts)
    );

    let updatedBasket;

    if (existingItemIndex >= 0) {
      updatedBasket = basketItems.map((basketItem, index) =>
        index === existingItemIndex
          ? { ...basketItem, quantity: basketItem.quantity + item.quantity }
          : basketItem
      );
    } else {
      updatedBasket = [...basketItems, item];
    }

    setBasketItems(updatedBasket);
    setIsNewItemAdded(true);

    // Update the basket on the server
    try {
      const consentId = getCookie('cookie_consent_id');
      const response = await axios.post('/api/updateBasket', {
        consentId,
        basketItems: updatedBasket,
      });
      if (!response.data.success) {
        console.error('Failed to update basket:', response.data);
      }
    } catch (error) {
      console.error('Error updating basket:', error);
    }
  };

  const removeItemFromBasket = async (index) => {
    const updatedBasket = basketItems.filter((_, i) => i !== index);
    setBasketItems(updatedBasket);

    // Update the basket on the server
    try {
      const consentId = getCookie('cookie_consent_id');
      const response = await axios.post('/api/updateBasket', {
        consentId,
        basketItems: updatedBasket,
      });
      if (!response.data.success) {
        console.error('Failed to update basket:', response.data);
      }
    } catch (error) {
      console.error('Error updating basket:', error);
    }
  };

  const updateItemQuantity = async (index, newQuantity) => {
    if (newQuantity < 1) {
      return; // Do nothing if quantity is less than 1
    } else {
      const updatedBasket = basketItems.map((item, i) =>
        i === index ? { ...item, quantity: newQuantity } : item
      );
      setBasketItems(updatedBasket);

      // Update the basket on the server
      try {
        const consentId = getCookie('cookie_consent_id');
        const response = await axios.post('/api/updateBasket', {
          consentId,
          basketItems: updatedBasket,
        });
        if (!response.data.success) {
          console.error('Failed to update basket:', response.data);
        }
      } catch (error) {
        console.error('Error updating basket:', error);
      }
    }
  };

  const updateCustomerDetails = async (updatedDetails) => {
    setCustomerDetails(updatedDetails);

    // Update customer details on the server
    try {
      const consentId = getCookie('cookie_consent_id');
      const response = await axios.post('/api/updateCustomerDetails', {
        consentId,
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
        addItemToBasket,
        removeItemFromBasket,
        setBasketItems,
        customerDetails,
        updateCustomerDetails,
        isNewItemAdded,
        setIsNewItemAdded,
        updateItemQuantity,
      }}
    >
      {children}
    </BasketContext.Provider>
  );
};

export const useBasket = () => useContext(BasketContext);
