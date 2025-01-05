import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  FC,
} from 'react';
import axios from 'axios';

// --------------------------------------------------
// Interfaces
// --------------------------------------------------

interface CustomerDetails {
  customerType: string;
  fullName: string;
  mobileNumber: string;
  email: string;
  address: string;
  streetNumber: string;
  postalCode: string;
  city: string;
  country: string;
}

interface BasketItem {
  slug: string;
  quantity: number;
  pricePerPackage: number;
  totalPrice: number;
  recyclingFeePerPackage?: number;
  totalRecyclingFee?: number;
  [key: string]: any; // In case you have other fields
}

interface BasketDetails {
  items?: BasketItem[];
  customerDetails?: CustomerDetails;
  // Add other fields if needed
}

interface SessionResponse {
  session?: {
    basketDetails?: BasketDetails;
  };
  // Add other properties if your API returns them
}

// For "addItemToBasket" prop
interface AddItemParams {
  selectionId: string;
  quantity: number;
}

// --------------------------------------------------
// Context Value Interface
// --------------------------------------------------
export interface BasketContextValue {
  basketItems: BasketItem[];
  isBasketLoaded: boolean;
  addItemToBasket: (params: AddItemParams) => Promise<void>;
  removeItemFromBasket: (index: number) => Promise<void>;
  customerDetails: CustomerDetails;
  updateCustomerDetails: (updatedDetails: CustomerDetails) => Promise<void>;
  updateItemQuantity: (index: number, newQuantity: number) => Promise<void>;

  // NEW: For showing/hiding an "item added" popup
  isNewItemAdded: boolean;
  setIsNewItemAdded: React.Dispatch<React.SetStateAction<boolean>>;
}

// --------------------------------------------------
// Create Context
// --------------------------------------------------
const BasketContext = createContext<BasketContextValue | undefined>(undefined);

// --------------------------------------------------
// Provider Props
// --------------------------------------------------
interface BasketProviderProps {
  children: ReactNode;
}

// --------------------------------------------------
// Provider Component
// --------------------------------------------------
export const BasketProvider: FC<BasketProviderProps> = ({ children }) => {
  const [basketItems, setBasketItems] = useState<BasketItem[]>([]);
  const [isBasketLoaded, setIsBasketLoaded] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
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

  // NEW: Manage "item added" popup state here
  const [isNewItemAdded, setIsNewItemAdded] = useState(false);

  const fetchBasketItems = async () => {
    try {
      const response = await axios.get<SessionResponse>('/api/firebase/1-getSession');
      console.log('Response from getSession:', response.data);

      const { basketDetails } = response.data.session || {};
      const items = basketDetails?.items;

      if (Array.isArray(items)) {
        setBasketItems(items);
      } else {
        setBasketItems([]);
      }

      if (basketDetails?.customerDetails) {
        setCustomerDetails(basketDetails.customerDetails);
      }
    } catch (error) {
      console.error('Error fetching basket items:', error);
    } finally {
      setIsBasketLoaded(true);
    }
  };

  useEffect(() => {
    void fetchBasketItems();
  }, []);

  const addItemToBasket = async ({ selectionId, quantity }: AddItemParams) => {
    try {
      const response = await axios.post('/api/firebase/4-updateBasket', {
        action: 'addItem',
        selectionId,
        quantity,
      });
      if (response.data.success) {
        await fetchBasketItems();
        // Trigger the popup
        setIsNewItemAdded(true);
      } else {
        console.error('Failed to add item to basket:', response.data);
        alert('Failed to add item: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Error adding item to basket:', error);
      if (error.response) {
        alert('Error adding item: ' + (error.response.data.error || error.message));
      } else {
        alert('Error adding item: ' + error.message);
      }
    }
  };

  const removeItemFromBasket = async (index: number) => {
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

  const updateItemQuantity = async (index: number, newQuantity: number) => {
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
          if (newItems[index].pricePerPackage) {
            newItems[index].totalPrice =
              newItems[index].pricePerPackage * newQuantity;
          }
          if (newItems[index].recyclingFeePerPackage) {
            newItems[index].totalRecyclingFee =
              newItems[index].recyclingFeePerPackage * newQuantity;
          }
          return newItems;
        });
      } else {
        console.error('Failed to update item quantity:', response.data);
      }
    } catch (error) {
      console.error('Error updating item quantity:', error);
    }
  };

  const updateCustomerDetails = async (updatedDetails: CustomerDetails) => {
    // Update local state
    setCustomerDetails(updatedDetails);

    // Update customer details on the server
    try {
      const response = await axios.post('/api/firebase/4-updateBasket', {
        action: 'updateCustomerDetails',
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
        isBasketLoaded,
        addItemToBasket,
        removeItemFromBasket,
        customerDetails,
        updateCustomerDetails,
        updateItemQuantity,
        isNewItemAdded,
        setIsNewItemAdded,
      }}
    >
      {children}
    </BasketContext.Provider>
  );
};

// --------------------------------------------------
// Export the custom hook
// --------------------------------------------------
export const useBasket = (): BasketContextValue => {
  const context = useContext(BasketContext);
  if (!context) {
    throw new Error('useBasket must be used within a BasketProvider.');
  }
  return context;
};
