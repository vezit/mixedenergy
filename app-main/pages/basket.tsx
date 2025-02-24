import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

// 1) Use the basket + session contexts
import { useBasket } from '../components/BasketContext';
import { useSessionContext } from '../contexts/SessionContext';

// 2) Import other components as needed
import Loading from '../components/Loading';
import ShippingAndPayment from '../components/ShippingAndPayment';
import OrderConfirmation, {
  IBasketItem,
  IBasketSummary,
} from '../components/OrderConfirmation';
import BasketItems from '../components/BasketItems';

// -- This is our updated CustomerDetailsForm (see below) --
import CustomerDetailsForm from '../components/CustomerDetailsForm'; // Example form

interface BasketProps {}

const Basket: React.FC<BasketProps> = () => {
  const router = useRouter();

  // --- BASKET context values ---
  const {
    basketItems,
    removeItemFromBasket,
    updateItemQuantity,
    customerDetails,
    updateCustomerDetails,
    isBasketLoaded,
  } = useBasket();

  // --- SESSION context values ---
  const { session, updateSession, fetchSession } = useSessionContext();

  // Local states for UI
  const [packagesData, setPackagesData] = useState<Record<string, any>>({});
  const [drinksData, setDrinksData] = useState<Record<string, any>>({});

  // For expand/collapse
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  // For any "exploded" animation logic
  const [explodedItems, setExplodedItems] = useState<Record<number, boolean>>({});

  // Delivery & Payment
  const [deliveryOption, setDeliveryOption] = useState<string>('pickupPoint');
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const [basketSummary, setBasketSummary] = useState<IBasketSummary | null>(null);

  // Validation states
  const [errors, setErrors] = useState<Record<string, any>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  /**
   * Example total price logic
   */
  const totalPrice = basketItems.reduce((acc, item: IBasketItem) => {
    return acc + (item.totalPrice ?? 0);
  }, 0);

  const totalRecyclingFee = basketItems.reduce((acc, item: IBasketItem) => {
    return acc + (item.totalRecyclingFee ?? 0);
  }, 0);

  /**
   * updateDeliveryDetailsInBackend => calls updateSession("updateDeliveryDetails").
   * This ensures the server side (Supabase) also stores the current delivery data.
   */
  const updateDeliveryDetailsInBackend = async (
    deliveryType: string,
    extras?: { selectedPickupPoint?: any }
  ): Promise<void> => {
    try {
      // Example data for the call:
      const provider = 'postnord'; // or 'gls'
      let deliveryAddress = {};
      let providerDetails = {};

      if (deliveryType === 'pickupPoint' && extras?.selectedPickupPoint) {
        // E.g. store the pickup point object or ID under providerDetails
        providerDetails = {
          postnord: {
            servicePoint: extras.selectedPickupPoint, // entire object
          },
        };
        // Also store some address for the "Ordreoversigt"
        deliveryAddress = {
          name: extras.selectedPickupPoint.name || '',
          address: `${extras.selectedPickupPoint.visitingAddress.streetName}, ${extras.selectedPickupPoint.visitingAddress.streetNumber}` || '',
          city: extras.selectedPickupPoint.visitingAddress.city || '',
          postalCode: extras.selectedPickupPoint.visitingAddress.postalCode || '',
          country: 'Danmark',
        };
      } else if (deliveryType === 'homeDelivery') {
        // Build a home-delivery address from `customerDetails`
        deliveryAddress = {
          name: customerDetails.fullName || '',
          address: customerDetails.address || '',
          city: customerDetails.city || '',
          postalCode: customerDetails.postalCode || '',
          country: 'Danmark',
        };
      }

      // Make the call to update session in Supabase
      await updateSession('updateDeliveryDetails', {
        provider,
        deliveryOption: deliveryType,
        deliveryAddress,
        providerDetails,
      });

      // Optionally re-fetch from the server so local `session` sees updated basket_summary
      await fetchSession();
    } catch (error) {
      console.error('Error updating delivery details:', error);
    }
  };

  /**
   * Basic item manipulation (BasketContext)
   */
  const removeItem = (itemIndex: number) => {
    removeItemFromBasket(itemIndex);
  };

  const updateQuantity = (itemIndex: number, newQuantity: number) => {
    updateItemQuantity(itemIndex, newQuantity);
  };

  const triggerExplosion = (itemIndex: number) => {
    setExplodedItems((prev) => ({ ...prev, [itemIndex]: true }));
  };

  const toggleExpand = (itemIndex: number) => {
    setExpandedItems((prev) => ({ ...prev, [itemIndex]: !prev[itemIndex] }));
  };

  /**
   * 3) Whenever the session changes, update local basketSummary and local states
   */
  useEffect(() => {
    if (session?.basket_details) {
      setBasketSummary(session.basket_details);

      const storedDeliveryOption = session.basket_details.deliveryDetails?.deliveryOption;
      if (storedDeliveryOption) {
        setDeliveryOption(storedDeliveryOption);
      }

      // If there's a stored pickup point in the DB, set local selectedPoint
      const sp =
        session.basket_details.deliveryDetails?.providerDetails?.postnord?.servicePoint;
      if (sp?.servicePointId) {
        setSelectedPoint(sp);
      }
    } else {
      setBasketSummary(null);
    }
  }, [session]);

  /**
   * 4) If basket is empty (after loaded), redirect home
   */
  useEffect(() => {
    if (isBasketLoaded && basketItems.length === 0) {
      router.push('/');
    }
  }, [isBasketLoaded, basketItems, router]);

  /**
   * 5) Example: fetch package data if needed
   */
  useEffect(() => {
    // ... optional logic to load packages data
  }, [basketItems]);

  /**
   * 6) Example: fetch drinks data if needed
   */
  useEffect(() => {
    // ... optional logic to load drinks data
  }, [basketItems]);

  return (
    <div className="p-8 w-full max-w-screen-lg mx-auto">
      {!isBasketLoaded ? (
        <Loading />
      ) : basketItems.length === 0 ? (
        <p>Din kurv er tom. Du bliver omdirigeret til forsiden...</p>
      ) : (
        <>
          {/* Basket Items */}
          <BasketItems
            basketItems={basketItems}
            expandedItems={expandedItems}
            toggleExpand={toggleExpand}
            packagesData={packagesData}
            drinksData={drinksData}
            updateQuantity={updateQuantity}
            explodedItems={explodedItems}
            triggerExplosion={triggerExplosion}
            removeItem={removeItem}
            totalPrice={totalPrice}
            totalRecyclingFee={totalRecyclingFee}
          />

          {/* Customer Details Form */}
          <CustomerDetailsForm
            customerDetails={customerDetails}
            updateCustomerDetails={updateCustomerDetails}
            updateDeliveryDetailsInBackend={updateDeliveryDetailsInBackend}
            errors={errors}
            setErrors={setErrors}
            touchedFields={touchedFields}
            setTouchedFields={setTouchedFields}
            submitAttempted={submitAttempted}
          />

          <div className="mb-4">
            <ShippingAndPayment
              deliveryOption={deliveryOption}
              setDeliveryOption={setDeliveryOption}
              customerDetails={customerDetails}
              updateDeliveryDetailsInBackend={updateDeliveryDetailsInBackend}
              selectedPoint={selectedPoint}
              setSelectedPoint={setSelectedPoint}
            />
          </div>

          {/* Order Confirmation */}
          <OrderConfirmation
            customerDetails={customerDetails}
            deliveryOption={deliveryOption}
            selectedPoint={selectedPoint}
            updateDeliveryDetailsInBackend={updateDeliveryDetailsInBackend}
            totalPrice={totalPrice}
            totalRecyclingFee={totalRecyclingFee}
            basketItems={basketItems}
            basketSummary={basketSummary}
            errors={errors}
            setErrors={setErrors}
            touchedFields={touchedFields}
            setTouchedFields={setTouchedFields}
            submitAttempted={submitAttempted}
            setSubmitAttempted={setSubmitAttempted}
          />
        </>
      )}
    </div>
  );
};

export default Basket;
