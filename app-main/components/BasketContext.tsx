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

/** Example of a basket item type. Adjust as needed. */
interface IBasketItem {
  slug: string;
  quantity: number;
  pricePerPackage?: number;
  totalPrice?: number;
}

/** Example: used for adding items to the basket. */
interface AddItemParams {
  selectionId: string;
  quantity: number;
}

/** What your context exposes to consumers. */
export interface BasketContextValue {
  basketItems: IBasketItem[];
  isBasketLoaded: boolean;

  addItemToBasket: (params: AddItemParams) => Promise<void>;
  removeItemFromBasket: (index: number) => Promise<void>;

  /** This is the unified interface. */
  customerDetails: ICustomerDetails;
  /** Accept partial updates if you only want to update certain fields. */
  updateCustomerDetails: (updatedDetails: Partial<ICustomerDetails>) => Promise<void>;
}

interface BasketProviderProps {
  children: ReactNode;
}

/** Create the context with our basket shape. */
const BasketContext = createContext<BasketContextValue | undefined>(undefined);

export const BasketProvider: FC<BasketProviderProps> = ({ children }) => {
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

  /** Example: fetch basket items on mount. */
  useEffect(() => {
    const fetchBasketItems = async () => {
      try {
        const response = await axios.post('/api/supabase/getOrCreateSession', {})
        // Example response might include a `basketDetails` object with customer details, etc.
        if (response.data.session?.basketDetails?.items) {
          setBasketItems(response.data.session.basketDetails.items);
        }
        if (response.data.session?.basketDetails?.customerDetails) {
          setCustomerDetails(response.data.session.basketDetails.customerDetails);
        }
      } catch (error) {
        console.error('Error fetching basket items:', error);
      } finally {
        setIsBasketLoaded(true);
      }
    };
    void fetchBasketItems();
  }, []);

  /** Example: add item to basket. */
  const addItemToBasket = async ({ selectionId, quantity }: AddItemParams) => {
    try {
      const response = await axios.post('/api/supabase/4-updateBasket', {
        action: 'addItem',
        selectionId,
        quantity,
      });
      if (response.data.success) {
        // Re-fetch items or update local state
      } else {
        console.error('Failed to add item:', response.data);
      }
    } catch (error) {
      console.error('Error adding item to basket:', error);
    }
  };

  /** Example: remove item from basket. */
  const removeItemFromBasket = async (index: number) => {
    try {
      const response = await axios.post('/api/supabase/4-updateBasket', {
        action: 'removeItem',
        itemIndex: index,
      });
      if (response.data.success) {
        // Update local state
        setBasketItems((prev) => {
          const newItems = [...prev];
          newItems.splice(index, 1);
          return newItems;
        });
      }
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  /** Update local + remote customer details. */
  const updateCustomerDetails = async (
    updatedDetails: Partial<ICustomerDetails>
  ): Promise<void> => {
    // Update local state first
    setCustomerDetails((prev) => ({ ...prev, ...updatedDetails }));

    // Persist to backend
    try {
      await axios.post('/api/supabase/4-updateBasket', {
        action: 'updateCustomerDetails',
        customerDetails: updatedDetails,
      });
    } catch (error) {
      console.error('Error updating customer details:', error);
    }
  };

  /** Provide these values to consumers. */
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
