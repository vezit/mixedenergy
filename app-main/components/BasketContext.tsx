import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  FC,
} from 'react';
import { useSessionContext } from '../contexts/SessionContext'; // <-- new import
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

  // Access the session + updateSession from our SessionProvider
  const { session, loading, updateSession } = useSessionContext();

  /**
   * On mount (and whenever session changes):
   * - If session is loaded, read basket details into local state
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
      // fallback if cookie is blocked
      const sessionId = getCookie('session_id') ?? undefined;
      const response = await updateSession(
        'addItem',
        { selectionId, quantity },
        sessionId
      );
      // If server responds with updated items
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
      const sessionId = getCookie('session_id') ?? undefined;
      const response = await updateSession(
        'removeItem',
        { itemIndex: index },
        sessionId
      );
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
      const sessionId = getCookie('session_id') ?? undefined;
      const response = await updateSession(
        'updateQuantity',
        { itemIndex: index, newQuantity },
        sessionId
      );
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
  const updateCustomerDetails = async (
    updatedDetails: Partial<ICustomerDetails>
  ) => {
    // optimistic update
    setCustomerDetails((prev) => ({ ...prev, ...updatedDetails }));

    try {
      const sessionId = getCookie('session_id') ?? undefined;
      const response = await updateSession(
        'updateCustomerDetails',
        { customerDetails: updatedDetails },
        sessionId
      );
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
