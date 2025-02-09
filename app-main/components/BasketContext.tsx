// /components/BasketContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  FC,
} from 'react';
import axios from 'axios';
import { ICustomerDetails } from '../types/ICustomerDetails';
import { getSession } from '../lib/session';
import { getCookie } from '../lib/cookies';

axios.defaults.withCredentials = true;

export interface IBasketItem {
  slug: string;
  quantity: number;
  packages_size?: number;
  selectedDrinks?: Record<string, number>;
  pricePerPackage?: number;
  totalPrice?: number;
  totalRecyclingFee?: number;
  sugarPreference?: string;
}

interface AddItemParams {
  selectionId: string;
  quantity: number;
}

export interface BasketContextValue {
  basketItems: IBasketItem[];
  isBasketLoaded: boolean;
  addItemToBasket: (params: AddItemParams) => Promise<void>;
  removeItemFromBasket: (index: number) => Promise<void>;
  updateItemQuantity: (index: number, newQuantity: number) => Promise<void>;
  customerDetails: ICustomerDetails;
  updateCustomerDetails: (updatedDetails: Partial<ICustomerDetails>) => Promise<void>;
}

const BasketContext = createContext<BasketContextValue | undefined>(undefined);

export const BasketProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [basketItems, setBasketItems] = useState<IBasketItem[]>([]);
  const [isBasketLoaded, setIsBasketLoaded] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<ICustomerDetails>({
    customerType: 'Privat',
    fullName: '',
    mobileNumber: '',
    email: '',
    address: '',
    streetNumber: '',
    postalCode: '',
    city: '',
    country: 'Danmark',
  });

  // On mount: fetch or create the session
  useEffect(() => {
    const fetchBasketItems = async () => {
      try {
        // single call to /api/supabase/session
        const response = await getSession(/* noBasket=false */);
        const sessionData = response.session;
        // if the row has basket_details, store in state
        if (sessionData.basket_details?.items) {
          setBasketItems(sessionData.basket_details.items);
        }
        if (sessionData.basket_details?.customerDetails) {
          setCustomerDetails(sessionData.basket_details.customerDetails);
        }
      } catch (error) {
        console.error('Error fetching or creating session:', error);
      } finally {
        setIsBasketLoaded(true);
      }
    };
    void fetchBasketItems();
  }, []);

  // addItem
  const addItemToBasket = async ({ selectionId, quantity }: AddItemParams) => {
    try {
      const sessionId = getCookie('session_id');
      const response = await axios.post('/api/supabase/4-updateBasket', {
        action: 'addItem',
        selectionId,
        quantity,
        sessionId,
      });
      if (response.data.success && response.data.items) {
        setBasketItems(response.data.items);
      }
    } catch (error) {
      console.error('Error adding item to basket:', error);
    }
  };

  // removeItem
  const removeItemFromBasket = async (index: number) => {
    try {
      const sessionId = getCookie('session_id');
      const response = await axios.post('/api/supabase/4-updateBasket', {
        action: 'removeItem',
        itemIndex: index,
        sessionId,
      });
      if (response.data.success && response.data.items) {
        setBasketItems(response.data.items);
      }
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  // updateQuantity
  const updateItemQuantity = async (index: number, newQuantity: number) => {
    try {
      const sessionId = getCookie('session_id');
      const response = await axios.post('/api/supabase/4-updateBasket', {
        action: 'updateQuantity',
        itemIndex: index,
        newQuantity,
        sessionId,
      });
      if (response.data.success && response.data.items) {
        setBasketItems(response.data.items);
      }
    } catch (error) {
      console.error('Error updating item quantity:', error);
    }
  };

  // updateCustomerDetails
  const updateCustomerDetails = async (updatedDetails: Partial<ICustomerDetails>) => {
    setCustomerDetails((prev) => ({ ...prev, ...updatedDetails }));
    try {
      const sessionId = getCookie('session_id');
      const response = await axios.post('/api/supabase/4-updateBasket', {
        action: 'updateCustomerDetails',
        customerDetails: updatedDetails,
        sessionId,
      });
      if (!response.data.success) {
        console.warn('Warning updating customer details', response.data);
      }
    } catch (error) {
      console.error('Error updating customer details:', error);
    }
  };

  return (
    <BasketContext.Provider
      value={{
        basketItems,
        isBasketLoaded,
        addItemToBasket,
        removeItemFromBasket,
        updateItemQuantity,
        customerDetails,
        updateCustomerDetails,
      }}
    >
      {children}
    </BasketContext.Provider>
  );
};

export const useBasket = (): BasketContextValue => {
  const ctx = useContext(BasketContext);
  if (!ctx) {
    throw new Error('useBasket must be used within a BasketProvider.');
  }
  return ctx;
};
