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
 * Basket page refactored to use SessionContext & BasketContext (Supabase),
 * removing old Firebase endpoints (5-getBasket, 4-updateBasket).
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
   * - session: includes session?.basket_details
   * - updateSession(action, body)
   * - fetchSession() if we need to re-pull the entire session from DB
   */
  const { session, updateSession, fetchSession } = useSessionContext();

  // Local UI states
  const [packagesData, setPackagesData] = useState<Record<string, any>>({});
  const [explodedItems, setExplodedItems] = useState<Record<number, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [drinksData, setDrinksData] = useState<Record<string, any>>({});

  const [deliveryOption, setDeliveryOption] = useState<string>('pickupPoint');
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  /**
   * Because we used to store a "basketSummary",
   * we can store that from `session?.basket_details` or skip it entirely.
   * Let's keep it for your `OrderConfirmation` component, if needed.
   */
  const [basketSummary, setBasketSummary] = useState<IBasketSummary | null>(null);

  // Form error states
  const [errors, setErrors] = useState<Record<string, any>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  /**
   * Example total price logic
   */
  const totalPrice = basketItems.reduce((acc, item: IBasketItem) => {
    const itemPrice = item.totalPrice ?? 0;
    return acc + itemPrice;
  }, 0);

  const totalRecyclingFee = basketItems.reduce((acc, item: IBasketItem) => {
    const recyclingFee = item.totalRecyclingFee ?? 0;
    return acc + recyclingFee;
  }, 0);

  /**
   * 1) "updateDeliveryDetailsInBackend" now uses `updateSession("updateDeliveryDetails")`.
   *    Then we can do `fetchSession()` to refresh the local session if needed.
   */
  const updateDeliveryDetailsInBackend = async (
    deliveryType: string,
    extras?: { selectedPickupPoint?: any }
  ): Promise<void> => {
    try {
      // For example, if you have a provider, address, etc.
      let provider = 'postnord'; // or 'gls', whichever logic you want
      let deliveryAddress = {};
      let providerDetails = {};

      if (deliveryType === 'pickupPoint' && extras?.selectedPickupPoint) {
        providerDetails = {
          postnord: { servicePointId: extras.selectedPickupPoint },
        };
        deliveryAddress = {
          // e.g. the address of the pickup point
        };
      } else if (deliveryType === 'homeDelivery') {
        // your logic ...
      }

      // Make the call to update session
      await updateSession('updateDeliveryDetails', {
        provider,
        deliveryOption: deliveryType,
        deliveryAddress,
        providerDetails,
      });

      // Optionally refresh session from DB
      await fetchSession();
    } catch (error) {
      console.error('Error updating delivery details:', error);
    }
  };

  /**
   * 2) Basic basket item manipulation (already uses our BasketContext)
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
   * 3) Keep an eye on session?.basket_details to populate local `basketSummary`,
   *    or we can just pass session?.basket_details directly to <OrderConfirmation> if you prefer.
   */
  useEffect(() => {
    if (session?.basket_details) {
      // Suppose your IBasketSummary = { items, customerDetails, deliveryDetails, etc. }
      setBasketSummary(session.basket_details);
      if (session.basket_details?.deliveryDetails?.deliveryType) {
        setDeliveryOption(session.basket_details.deliveryDetails.deliveryType);
      }
      if (
        session.basket_details?.deliveryDetails?.providerDetails?.postnord
          ?.servicePointId
      ) {
        setSelectedPoint(
          session.basket_details.deliveryDetails.providerDetails.postnord.servicePointId
        );
      }
    } else {
      setBasketSummary(null);
    }
  }, [session]);

  /**
   * 4) If basket is empty after loaded, redirect home
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
    // ... your logic to load "packagesData"
  }, [basketItems]);

  /**
   * 6) Example: fetch drinks data if needed
   */
  useEffect(() => {
    // ... your logic to load "drinksData"
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
            basketSummary={basketSummary} // from session.basket_details
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
