import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

/** 
 * Example: your custom hook from "BasketContext" 
 * (the actual code may differ—this is just an example).
 */
import { useBasket } from '../components/BasketContext';

/** 
 * Some auxiliary components 
 * (e.g. placeholders; your actual code may vary).
 */
import Loading from '../components/Loading';
import ShippingAndPayment from '../components/ShippingAndPayment';
import OrderConfirmation, { IBasketItem, IBasketSummary } from '../components/OrderConfirmation';
import BasketItems from '../components/BasketItems';

/**
 * Import the form component and the interface separately.
 */
import { ICustomerDetails } from '../types/ICustomerDetails';

interface BasketProps {}

const Basket: React.FC<BasketProps> = () => {
  const router = useRouter();

  /**
   * These come from your basket context or however you manage state:
   *
   *   basketItems: IBasketItem[]
   *   removeItemFromBasket: (itemIndex: number) => void
   *   updateItemQuantity: (itemIndex: number, newQty: number) => void
   *   customerDetails: ICustomerDetails
   *   updateCustomerDetails: (details: Partial<ICustomerDetails>) => void
   *   isBasketLoaded: boolean
   */
  const {
    basketItems,
    removeItemFromBasket,
    updateItemQuantity,
    customerDetails, //  ICustomerDetails
    updateCustomerDetails, // (details: Partial<ICustomerDetails>) => void
    isBasketLoaded,
  } = useBasket();

  /** Local state */
  const [packagesData, setPackagesData] = useState<Record<string, any>>({});
  const [explodedItems, setExplodedItems] = useState<Record<number, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [drinksData, setDrinksData] = useState<Record<string, any>>({});

  const [deliveryOption, setDeliveryOption] = useState<string>('pickupPoint');
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [basketSummary, setBasketSummary] = useState<IBasketSummary | null>(null);

  const [errors, setErrors] = useState<Record<string, any>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  /** Summation logic (example) */
  const totalPrice = basketItems.reduce((acc, item: IBasketItem) => {
    const itemPrice = (item as any).totalPrice ?? 0;
    return acc + itemPrice;
  }, 0);

  const totalRecyclingFee = basketItems.reduce((acc, item: IBasketItem) => {
    const recyclingFee = (item as any).totalRecyclingFee ?? 0;
    return acc + recyclingFee;
  }, 0);

  /**
   * Example function to update basket's delivery details in backend
   */
  const updateDeliveryDetailsInBackend = async (
    deliveryType: string,
    extras?: { selectedPickupPoint?: any }
  ): Promise<void> => {
    try {
      let deliveryAddress = {};
      let providerDetails = {};

      if (deliveryType === 'pickupPoint' && extras?.selectedPickupPoint) {
        // your logic ...
      } else if (deliveryType === 'homeDelivery') {
        // your logic ...
      }

      await fetch('/api/firebase/4-updateBasket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateDeliveryDetails',
          deliveryOption: deliveryType,
          deliveryAddress,
          providerDetails,
        }),
      });

      await fetchBasketSummary();
    } catch (error) {
      console.error('Error updating delivery details:', error);
    }
  };

  /** Basic basket item manipulation */
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

  /** Example: fetch package data if needed */
  useEffect(() => {
    // ...
  }, [basketItems]);

  /** If basket is empty after loaded, redirect home */
  useEffect(() => {
    if (isBasketLoaded && basketItems.length === 0) {
      router.push('/');
    }
  }, [isBasketLoaded, basketItems, router]);

  /** Example: fetch drinks data if needed */
  useEffect(() => {
    // ...
  }, [basketItems]);

  /** Fetch basket summary */
  const fetchBasketSummary = async () => {
    try {
      const r = await fetch('/api/firebase/5-getBasket');
      const data = await r.json();
      setBasketSummary(data.basketDetails ?? null);

      if (data.basketDetails?.deliveryDetails?.deliveryType) {
        setDeliveryOption(data.basketDetails.deliveryDetails.deliveryType);
      }
      if (data.basketDetails?.deliveryDetails?.providerDetails?.postnord?.servicePointId) {
        setSelectedPoint(data.basketDetails.deliveryDetails.providerDetails.postnord.servicePointId);
      }
    } catch (error) {
      console.error('Error fetching basket summary:', error);
    }
  };

  /** Re-fetch summary when certain fields change */
  useEffect(() => {
    fetchBasketSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerDetails, deliveryOption]);

  /** If we have basket items + summary, do anything extra if needed */
  useEffect(() => {
    if (basketItems.length > 0 && basketSummary?.deliveryDetails) {
      // ...
    }
  }, [basketItems, basketSummary, deliveryOption, customerDetails]);

  if (!isBasketLoaded) {
    return <Loading />;
  }

  return (
    <div className="p-8 w-full max-w-screen-lg mx-auto">
      {basketItems.length === 0 ? (
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
            customerDetails={customerDetails} // ICustomerDetails
            updateCustomerDetails={updateCustomerDetails} // (details: Partial<ICustomerDetails>) => void
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
              customerDetails={customerDetails} // also ICustomerDetails
              updateDeliveryDetailsInBackend={updateDeliveryDetailsInBackend}
              selectedPoint={selectedPoint}
              setSelectedPoint={setSelectedPoint}
            />
          </div>

          {/* Order Confirmation */}
          <OrderConfirmation
            customerDetails={customerDetails} // ICustomerDetails
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
