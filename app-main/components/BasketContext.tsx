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

/** Example basket item type */
interface IBasketItem {
  slug: string;
  quantity: number;
  packages_size?: number;
  selectedDrinks?: Record<string, number>;
  pricePerPackage?: number;
  totalPrice?: number;
  totalRecyclingFee?: number;
  sugarPreference?: string;
}

/** Parameters to add an item */
interface AddItemParams {
  selectionId: string;
  quantity: number;
}

/** The context value type */
export interface BasketContextValue {
  basketItems: IBasketItem[];
  isBasketLoaded: boolean;
  addItemToBasket: (params: AddItemParams) => Promise<void>;
  removeItemFromBasket: (index: number) => Promise<void>;
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

  // Fetch session on mount
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
   * Add an item to basket using our 4-updateBasket API
   * Then update local state with the new list of items.
   */
  const addItemToBasket = async ({ selectionId, quantity }: AddItemParams) => {
    try {
      const response = await axios.post('/api/supabase/4-updateBasket', {
        action: 'addItem',
        selectionId,
        quantity,
      });
      if (response.data.success) {
        // Response now contains an updated "items" array
        if (response.data.items) {
          setBasketItems(response.data.items);
        }
      } else {
        console.error('Failed to add item:', response.data);
      }
    } catch (error) {
      console.error('Error adding item to basket:', error);
    }
  };

  const removeItemFromBasket = async (index: number) => {
    try {
      const response = await axios.post('/api/supabase/4-updateBasket', {
        action: 'removeItem',
        itemIndex: index,
      });
      if (response.data.success) {
        // The API returns updated items, so we sync them
        if (response.data.items) {
          setBasketItems(response.data.items);
        } else {
          // Or manually remove from local state
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

  const updateCustomerDetails = async (updatedDetails: Partial<ICustomerDetails>) => {
    // Update local state first
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
