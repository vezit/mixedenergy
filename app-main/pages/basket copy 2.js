// pages/basket.js

import { useState, useEffect } from 'react';
import router from 'next/router';
import { useBasket } from '../components/BasketContext';
import Loading from '../components/Loading';
import CustomerDetails from '../components/CustomerDetails';
import ShippingAndPayment from '../components/ShippingAndPayment';
import OrderConfirmation from '../components/OrderConfirmation';
import BasketItems from '../components/BasketItems';

export default function Basket() {
  const {
    basketItems,
    removeItemFromBasket,
    updateItemQuantity,
    customerDetails,
    updateCustomerDetails,
    isBasketLoaded,
  } = useBasket();

  const [packagesData, setPackagesData] = useState({});
  const [explodedItems, setExplodedItems] = useState({});
  const [expandedItems, setExpandedItems] = useState({});
  const [drinksData, setDrinksData] = useState({});
  const [deliveryOption, setDeliveryOption] = useState('pickupPoint');
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [basketSummary, setBasketSummary] = useState(null);
  const [errors, setErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});

  const totalPrice = basketItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalRecyclingFee = basketItems.reduce((sum, item) => sum + item.totalRecyclingFee, 0);

  // Update delivery details in backend
  const updateDeliveryDetailsInBackend = async (option, deliveryData) => {
    try {
      let deliveryAddress = {};
      let providerDetails = {};

      if (option === 'pickupPoint') {
        const selectedPickupPoint = deliveryData.selectedPickupPoint;
        if (selectedPickupPoint) {
          deliveryAddress = {
            name: selectedPickupPoint.name,
            streetName: selectedPickupPoint.visitingAddress.streetName,
            streetNumber: selectedPickupPoint.visitingAddress.streetNumber,
            postalCode: selectedPickupPoint.visitingAddress.postalCode,
            city: selectedPickupPoint.visitingAddress.city,
            country: 'Danmark',
          };
          providerDetails = {
            postnord: {
              servicePointId: selectedPickupPoint.servicePointId,
              deliveryMethod: 'pickupPoint',
            },
          };
        }
      } else if (option === 'homeDelivery') {
        // Check if we have enough details for home delivery
        if (
          customerDetails.fullName &&
          customerDetails.address &&
          customerDetails.postalCode &&
          customerDetails.city
        ) {
          deliveryAddress = {
            name: customerDetails.fullName,
            streetName: customerDetails.address,
            streetNumber: '',
            postalCode: customerDetails.postalCode,
            city: customerDetails.city,
            country: 'Danmark',
          };
          providerDetails = {
            postnord: {
              servicePointId: null,
              deliveryMethod: 'homeDelivery',
            },
          };
        }
      }

      // Send delivery details to the backend
      await fetch('/api/firebase/4-updateBasket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateDeliveryDetails',
          deliveryOption: option,
          deliveryAddress,
          providerDetails,
        }),
      });

      // After updating delivery details, fetch the basket summary again to get the updated delivery fee
      await fetchBasketSummary();
    } catch (error) {
      console.error('Error updating delivery details:', error);
    }
  };

  // Function to remove item from basket after explosion effect
  const removeItem = (itemIndex) => {
    removeItemFromBasket(itemIndex);
  };

  // Function to update item quantity
  const updateQuantity = (itemIndex, newQuantity) => {
    updateItemQuantity(itemIndex, newQuantity);
    // Once updated, this will trigger the useEffect below which updates delivery details
  };

  // Function to trigger explosion effect
  const triggerExplosion = (itemIndex) => {
    setExplodedItems((prev) => ({
      ...prev,
      [itemIndex]: true,
    }));
  };

  // Toggle expansion of a basket item
  const toggleExpand = (index) => {
    setExpandedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Fetch packages data whenever basket items change
  useEffect(() => {
    const packageSlugsSet = new Set();
    basketItems.forEach((item) => {
      if (item.slug) {
        packageSlugsSet.add(item.slug);
      }
    });
    const packageSlugs = Array.from(packageSlugsSet);

    if (packageSlugs.length > 0) {
      fetch('/api/firebase/2-getPackages')
        .then((res) => res.json())
        .then((data) => {
          const packages = data.packages;
          const packagesBySlug = {};
          packages.forEach((pkg) => {
            if (packageSlugs.includes(pkg.slug)) {
              packagesBySlug[pkg.slug] = pkg;
            }
          });
          setPackagesData(packagesBySlug);
        })
        .catch((error) => {
          console.error('Error fetching packages data:', error);
        });
    }
  }, [basketItems]);

  useEffect(() => {
    if (isBasketLoaded && basketItems.length === 0) {
      router.push('/');
    }
  }, [isBasketLoaded, basketItems, router]);

  // Fetch drinks data based on selectedDrinks
  useEffect(() => {
    const drinkSlugsSet = new Set();
    basketItems.forEach((item) => {
      if (item.selectedDrinks) {
        Object.keys(item.selectedDrinks).forEach((slug) => {
          drinkSlugsSet.add(slug);
        });
      }
    });
    const drinkSlugs = Array.from(drinkSlugsSet);

    if (drinkSlugs.length > 0) {
      fetch('/api/firebase/3-getDrinksBySlugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugs: drinkSlugs }),
      })
        .then((res) => res.json())
        .then((data) => {
          setDrinksData(data.drinks);
        })
        .catch((error) => {
          console.error('Error fetching drinks data:', error);
        });
    }
  }, [basketItems]);

  // Function to fetch basket summary (used after delivery details update)
  const fetchBasketSummary = async () => {
    try {
      const res = await fetch('/api/firebase/5-getBasket');
      const data = await res.json();
      setBasketSummary(data.basketDetails);
      // Update delivery option and selectedPoint based on basket summary
      if (data.basketDetails.deliveryDetails.deliveryType) {
        setDeliveryOption(data.basketDetails.deliveryDetails.deliveryType);
      }
      if (data.basketDetails.deliveryDetails.providerDetails?.postnord?.servicePointId) {
        setSelectedPoint(data.basketDetails.deliveryDetails.providerDetails.postnord.servicePointId);
      }
    } catch (error) {
      console.error('Error fetching basket summary:', error);
    }
  };

  // Initially fetch basket summary
  useEffect(() => {
    fetchBasketSummary();
  }, [customerDetails, deliveryOption]);

  // Live update delivery details whenever basketItems change
  // This ensures that whenever the user changes quantity or removes an item,
  // the backend recalculates the delivery fee based on updated weight.
  useEffect(() => {
    if (basketItems.length > 0) {
      if (deliveryOption === 'pickupPoint' && basketSummary?.deliveryDetails?.providerDetails?.postnord?.servicePointId) {
        // If we have a selected pickup point stored in basketSummary
        // Use the same data to reupdate the delivery details
        const selectedPickupPoint = {
          name: basketSummary.deliveryDetails.deliveryAddress.name,
          visitingAddress: {
            streetName: basketSummary.deliveryDetails.deliveryAddress.streetName,
            streetNumber: basketSummary.deliveryDetails.deliveryAddress.streetNumber,
            postalCode: basketSummary.deliveryDetails.deliveryAddress.postalCode,
            city: basketSummary.deliveryDetails.deliveryAddress.city,
          },
          servicePointId: basketSummary.deliveryDetails.providerDetails.postnord.servicePointId,
        };
        updateDeliveryDetailsInBackend('pickupPoint', { selectedPickupPoint });
      } else if (deliveryOption === 'homeDelivery') {
        // For home delivery, ensure we have full address
        if (
          customerDetails.fullName &&
          customerDetails.address &&
          customerDetails.postalCode &&
          customerDetails.city
        ) {
          updateDeliveryDetailsInBackend('homeDelivery', {});
        }
      }
    }
  }, [basketItems, deliveryOption, basketSummary, customerDetails]);

  if (!isBasketLoaded) {
    return <Loading />;
  }

  return (
    <div className="p-8 w-full max-w-screen-lg mx-auto">
      {basketItems.length === 0 ? (
        <p>Din kurv er tom. Du bliver omdirigeret til forsiden.</p>
      ) : (
        <>
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

          <CustomerDetails
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
}
