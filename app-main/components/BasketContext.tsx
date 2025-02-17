
// BasketContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  FC,
} from 'react';
import { useSessionContext } from '../contexts/SessionContext';
import { getCookie } from '../lib/cookies';
import { ICustomerDetails } from '../types/ICustomerDetails';

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

  // Default/initial customer details
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

  // Pull from SessionContext, which has updateSession in named-param style
  const { session, loading, updateSession } = useSessionContext();

  /**
   * Whenever the session changes (and is not loading),
   * read the basket_details from session into local state
   */
  useEffect(() => {
    if (!loading && session?.session?.basket_details) {
      const { items, customerDetails: custDet } = session.session.basket_details;

      if (items) {
        setBasketItems(items);
      }
      if (custDet) {
        setCustomerDetails(custDet);
      }
      setIsBasketLoaded(true);
    }
  }, [loading, session]);

  /**
   * 1) addItemToBasket
   */
  const addItemToBasket = async ({ selectionId, quantity }: AddItemParams) => {
    try {
      // fallback session ID if cookie is blocked
      const fallbackSessionId = getCookie('session_id') ?? undefined;

      // Call updateSession in *named param* style
      const response = await updateSession({
        action: 'addItem',
        data: { selectionId, quantity },
        sessionId: fallbackSessionId,
      });

      if (response?.success && response.items) {
        setBasketItems(response.items);
      }
    } catch (error) {
      console.error('Error adding item to basket:', error);
    }
  };

  /**
   * 2) removeItemFromBasket
   */
  const removeItemFromBasket = async (index: number) => {
    try {
      const fallbackSessionId = getCookie('session_id') ?? undefined;

      const response = await updateSession({
        action: 'removeItem',
        data: { itemIndex: index },
        sessionId: fallbackSessionId,
      });

      if (response?.success && response.items) {
        setBasketItems(response.items);
      }
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  /**
   * 3) updateItemQuantity
   */
  const updateItemQuantity = async (index: number, newQuantity: number) => {
    try {
      const fallbackSessionId = getCookie('session_id') ?? undefined;

      const response = await updateSession({
        action: 'updateQuantity',
        data: { itemIndex: index, quantity: newQuantity },
        sessionId: fallbackSessionId,
      });

      if (response?.success && response.items) {
        setBasketItems(response.items);
      }
    } catch (error) {
      console.error('Error updating item quantity:', error);
    }
  };

  /**
   * 4) updateCustomerDetails
   */
  const updateCustomerDetails = async (updatedDetails: Partial<ICustomerDetails>) => {
    // Optimistic update
    setCustomerDetails((prev) => ({ ...prev, ...updatedDetails }));

    try {
      const fallbackSessionId = getCookie('session_id') ?? undefined;

      const response = await updateSession({
        action: 'updateCustomerDetails',
        data: { customerDetails: updatedDetails },
        sessionId: fallbackSessionId,
      });

      if (!response?.success) {
        console.warn('Warning updating customer details:', response);
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
