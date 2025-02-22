// pages/basket.ts (or /components/Basket.tsx, depending on your folder structure)
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
import CustomerDetailsForm from '../components/CustomerDetailsForm'; // Example form

interface BasketProps {}

/**
 * Basket page that uses SessionContext & BasketContext (Supabase),
 * removing old Firebase endpoints.
 */
const Basket: React.FC<BasketProps> = () => {
  const router = useRouter();

  /**
   * BASKET context values:
   * - basketItems, removeItemFromBasket, updateItemQuantity, etc.
   */
  const {
    basketItems,
    removeItemFromBasket,
    updateItemQuantity,
    customerDetails,
    updateCustomerDetails,
    isBasketLoaded,
  } = useBasket();

  /**
   * SESSION context values:
   * - session => includes session?.basket_details
   * - updateSession(action, body)
   * - fetchSession() => re-pull entire session from DB
   */
  const { session, updateSession, fetchSession } = useSessionContext();

  // Local states for UI
  const [packagesData, setPackagesData] = useState<Record<string, any>>({});
  const [explodedItems, setExplodedItems] = useState<Record<number, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [drinksData, setDrinksData] = useState<Record<string, any>>({});

  const [deliveryOption, setDeliveryOption] = useState<string>('pickupPoint');
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // We'll store basket_details in a local "basketSummary" if needed
  const [basketSummary, setBasketSummary] = useState<IBasketSummary | null>(null);

  // Form error states
  const [errors, setErrors] = useState<Record<string, any>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

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
   * 1) "updateDeliveryDetailsInBackend" => calls updateSession("updateDeliveryDetails").
   */
  const updateDeliveryDetailsInBackend = async (
    deliveryType: string,
    extras?: { selectedPickupPoint?: any }
  ): Promise<void> => {
    try {
      // Example data for the call:
      let provider = 'postnord'; // or 'gls'
      let deliveryAddress = {};
      let providerDetails = {};

      // extras?.selectedPickupPoint is empty then call 

      if (deliveryType === 'pickupPoint' && extras?.selectedPickupPoint) {
        // E.g. store the pickup point ID under providerDetails
        providerDetails = {
          postnord: { servicePointId: extras.selectedPickupPoint },
        };
        // Possibly store address if you know it
        deliveryAddress = {};
      } else if (deliveryType === 'homeDelivery') {
        // Put logic to build a home delivery address here
      }

      // Make the call to update session
      await updateSession('updateDeliveryDetails', {
        provider,
        deliveryOption: deliveryType,
        deliveryAddress,
        providerDetails,
      });

      // Optionally re-fetch from the server to ensure we have the latest session
      await fetchSession();
    } catch (error) {
      console.error('Error updating delivery details:', error);
    }
  };

  /**
   * 2) Basic item manipulation (BasketContext)
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

  const toggleExpand = (index: number) => {
    setExpandedItems((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  /**
   * 3) Whenever the session changes, set local basketSummary & update UI states
   */
  useEffect(() => {
    if (session?.basket_details) {
      setBasketSummary(session.basket_details);

      if (session.basket_details.deliveryDetails?.deliveryType) {
        setDeliveryOption(session.basket_details.deliveryDetails.deliveryType);
      }
      if (session.basket_details.deliveryDetails?.providerDetails?.postnord?.servicePointId) {
        setSelectedPoint(
          session.basket_details.deliveryDetails.providerDetails.postnord.servicePointId
        );
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
    // ... logic to load packages data
  }, [basketItems]);

  /**
   * 6) Example: fetch drinks data if needed
   */
  useEffect(() => {
    // ... logic to load drinks data
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

          {/* Customer Details Form (example) */}
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
