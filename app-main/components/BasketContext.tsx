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

/** If you want every axios request to include cookies: */
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

  // On mount, load session
  useEffect(() => {
    const fetchBasketItems = async () => {
      try {
        const response = await getSession();
        if (response.session?.basketDetails?.items) {
          setBasketItems(response.session.basketDetails.items);
        }
        if (response.session?.basketDetails?.customerDetails) {
          setCustomerDetails(response.session.basketDetails.customerDetails);
        }
      } catch (error) {
        console.error('Error fetching basket items:', error);
      } finally {
        setIsBasketLoaded(true);
      }
    };
    void fetchBasketItems();
  }, []);

  // 1) addItem
  const addItemToBasket = async ({ selectionId, quantity }: AddItemParams) => {
    try {
      const sessionId = getCookie('session_id');
      const response = await axios.post('/api/supabase/4-updateBasket', {
        action: 'addItem',
        selectionId,
        quantity,
        sessionId, // fallback for server
      });
      if (response.data.success && response.data.items) {
        setBasketItems(response.data.items);
      } else {
        console.error('Failed to add item:', response.data);
      }
    } catch (error) {
      console.error('Error adding item to basket:', error);
    }
  };

  // 2) removeItem
  const removeItemFromBasket = async (index: number) => {
    try {
      const sessionId = getCookie('session_id');
      const response = await axios.post('/api/supabase/4-updateBasket', {
        action: 'removeItem',
        itemIndex: index,
        sessionId,
      });
      if (response.data.success) {
        if (response.data.items) {
          setBasketItems(response.data.items);
        } else {
          // fallback removal
          setBasketItems((prev) => {
            const newItems = [...prev];
            newItems.splice(index, 1);
            return newItems;
          });
        }
      }
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  // 3) updateQuantity
  const updateItemQuantity = async (index: number, newQuantity: number) => {
    try {
      const sessionId = getCookie('session_id');
      const response = await axios.post('/api/supabase/4-updateBasket', {
        action: 'updateQuantity',
        itemIndex: index,
        newQuantity,
        sessionId,
      });
      if (response.data.success) {
        if (response.data.items) {
          setBasketItems(response.data.items);
        } else {
          setBasketItems((prev) => {
            const updated = [...prev];
            if (updated[index]) {
              updated[index].quantity = newQuantity;
            }
            return updated;
          });
        }
      }
    } catch (error) {
      console.error('Error updating item quantity:', error);
    }
  };

  // 4) updateCustomerDetails
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
        console.warn('Warning: partial failure updating customer details', response.data);
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
  const context = useContext(BasketContext);
  if (!context) {
    throw new Error('useBasket must be used within a BasketProvider.');
  }
  return context;
};
