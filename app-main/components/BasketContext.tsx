import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  FC,
} from 'react';

// We rely on the SessionContext to fetch the session & update it
import { useSessionContext } from '../contexts/SessionContext';
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

  // 1) Pull from SessionContext
  const { session, loading: sessionLoading, fetchSession, updateSession } = useSessionContext();

  /**
   * 2) On mount, ensure we fetch the session (if not already).
   *    Then set basket items from session.basket_details (if present).
   */
  useEffect(() => {
    // If the session isn't fetched yet, fetch it
    if (!session && !sessionLoading) {
      void fetchSession();
    }
  }, [session, sessionLoading, fetchSession]);

  /**
   * 3) Whenever `session` changes, update local basketItems + customerDetails
   */
  useEffect(() => {
    if (session?.basket_details) {
      const { items, customerDetails: custDet } = session.basket_details;

      if (Array.isArray(items)) {
        setBasketItems(items);
      } else {
        setBasketItems([]);
      }

      if (custDet) {
        setCustomerDetails((prev) => ({ ...prev, ...custDet }));
      }
    }
    // Once we've set them, consider the basket "loaded"
    if (session) {
      setIsBasketLoaded(true);
    }
  }, [session]);

  /**
   * 4) Add item to basket => calls updateSession('addItem')
   */
  const addItemToBasket = async ({ selectionId, quantity }: AddItemParams) => {
    try {
      // Flatten the request to match your "addItem" in updateSession
      const response = await updateSession('addItem', {
        selectionId,
        quantity,
      });
      // If success, the server returns new "items" in response.items
      if (response?.success && response.items) {
        setBasketItems(response.items);
      }
    } catch (error) {
      console.error('Error adding item to basket:', error);
    }
  };

  /**
   * 5) removeItemFromBasket => calls updateSession('removeItem')
   */
  const removeItemFromBasket = async (index: number) => {
    try {
      const response = await updateSession('removeItem', {
        itemIndex: index,
      });
      if (response?.success && response.items) {
        setBasketItems(response.items);
      }
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  /**
   * 6) updateItemQuantity => calls updateSession('updateQuantity')
   */
  const updateItemQuantity = async (index: number, newQuantity: number) => {
    try {
      if (newQuantity < 1) {
        console.warn('Quantity must be >= 1');
        return;
      }
      const response = await updateSession('updateQuantity', {
        itemIndex: index,
        quantity: newQuantity,
      });
      if (response?.success && response.items) {
        setBasketItems(response.items);
      }
    } catch (error) {
      console.error('Error updating item quantity:', error);
    }
  };

  /**
   * 7) updateCustomerDetails => calls updateSession('updateCustomerDetails')
   */
  const updateCustomerDetails = async (updatedDetails: Partial<ICustomerDetails>) => {
    // Optimistic update
    setCustomerDetails((prev) => ({ ...prev, ...updatedDetails }));

    try {
      const response = await updateSession('updateCustomerDetails', {
        customerDetails: updatedDetails,
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
