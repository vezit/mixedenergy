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
import { getOrCreateSessionRequest } from '../lib/session';

/** Export the IBasketItem interface so other files can import it. */
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

/** Parameters when adding an item to the basket */
interface AddItemParams {
  selectionId: string;
  quantity: number;
}

/** The shape of our basket context state/methods */
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

  // Fetch basket data on mount (session info + existing items, if any)
  useEffect(() => {
    const fetchBasketItems = async () => {
      try {
        const response = await getOrCreateSessionRequest();
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

  /**
   * Add an item to the basket via our API,
   * then update local `basketItems` state from API response.
   */
  const addItemToBasket = async ({ selectionId, quantity }: AddItemParams) => {
    try {
      const response = await axios.post('/api/supabase/4-updateBasket', {
        action: 'addItem',
        selectionId,
        quantity,
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

  /**
   * Remove an item from the basket by index.
   */
  const removeItemFromBasket = async (index: number) => {
    try {
      const response = await axios.post('/api/supabase/4-updateBasket', {
        action: 'removeItem',
        itemIndex: index,
      });
      if (response.data.success) {
        if (response.data.items) {
          setBasketItems(response.data.items);
        } else {
          // If the API doesn't return the updated list, remove locally.
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

  /**
   * Update item quantity by index.
   */
  const updateItemQuantity = async (index: number, newQuantity: number) => {
    try {
      const response = await axios.post('/api/supabase/4-updateBasket', {
        action: 'updateQuantity',
        itemIndex: index,
        newQuantity,
      });
      if (response.data.success) {
        if (response.data.items) {
          setBasketItems(response.data.items);
        } else {
          // Fallback if no items array is returned
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

  /**
   * Update local + remote customer details (name, email, etc.).
   */
  const updateCustomerDetails = async (updatedDetails: Partial<ICustomerDetails>) => {
    // Update locally first
    setCustomerDetails((prev) => ({ ...prev, ...updatedDetails }));
    try {
      const response = await axios.post('/api/supabase/4-updateBasket', {
        action: 'updateCustomerDetails',
        customerDetails: updatedDetails,
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
