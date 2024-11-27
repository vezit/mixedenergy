// pages/basket.js

import { useState, useEffect } from 'react';
import router from 'next/router';
import { useBasket } from '../components/BasketContext';
import Loading from '../components/Loading';

// Import the new components
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

  // State for expanded items
  const [expandedItems, setExpandedItems] = useState({});

  // State for drinks data
  const [drinksData, setDrinksData] = useState({});

  // State for delivery option
  const [deliveryOption, setDeliveryOption] = useState('homeDelivery');

  // State for selected pickup point ID
  const [selectedPoint, setSelectedPoint] = useState(null);

  // State for basket summary
  const [basketSummary, setBasketSummary] = useState(null);

  // Compute total price and total recycling fee
  const totalPrice = basketItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalRecyclingFee = basketItems.reduce((sum, item) => sum + item.totalRecyclingFee, 0);

  // Function to update delivery details in the backend
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
        const { streetName, streetNumber } = splitAddress(customerDetails.address || '');
        if (
          customerDetails.fullName &&
          streetName &&
          streetNumber &&
          customerDetails.postalCode &&
          customerDetails.city
        ) {
          deliveryAddress = {
            name: customerDetails.fullName,
            streetName: streetName,
            streetNumber: streetNumber,
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

      // Send delivery details to the backend regardless of completeness
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
    } catch (error) {
      console.error('Error updating delivery details:', error);
    }
  };

  // Function to split address into streetName and streetNumber
  const splitAddress = (address) => {
    const regex = /^(.*?)(\s+\d+\S*)$/;
    const match = address.match(regex);
    if (match) {
      return {
        streetName: match[1].trim(),
        streetNumber: match[2].trim(),
      };
    } else {
      return {
        streetName: address,
        streetNumber: '',
      };
    }
  };

  // Function to remove item from basket after explosion effect
  const removeItem = (itemIndex) => {
    removeItemFromBasket(itemIndex);
  };

  // Function to update item quantity
  const updateQuantity = (itemIndex, newQuantity) => {
    updateItemQuantity(itemIndex, newQuantity);
  };

  // Function to trigger explosion effect
  const triggerExplosion = (itemIndex) => {
    setExplodedItems((prev) => ({
      ...prev,
      [itemIndex]: true,
    }));
  };

  // Function to toggle expansion of a basket item
  const toggleExpand = (index) => {
    setExpandedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Fetch package data when basket items change
  useEffect(() => {
    // Collect all the package slugs from basket items
    const packageSlugsSet = new Set();
    basketItems.forEach((item) => {
      if (item.slug) {
        packageSlugsSet.add(item.slug);
      }
    });
    const packageSlugs = Array.from(packageSlugsSet);

    if (packageSlugs.length > 0) {
      // Fetch packages data
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
      // Redirect immediately when basket is empty and data has loaded
      router.push('/');
    }
  }, [isBasketLoaded, basketItems, router]);

  // Fetch drinks data based on selectedDrinks in basket items
  useEffect(() => {
    // Collect all the drink slugs from basket items
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
      // Fetch drinks data
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

  // Fetch basket summary when relevant data changes
  useEffect(() => {
    // Fetch basket summary
    fetch('/api/firebase/5-getBasket')
      .then((res) => res.json())
      .then((data) => {
        setBasketSummary(data.basketDetails);
        // Update delivery option and selectedPoint based on basket summary
        if (data.basketDetails.deliveryDetails.deliveryType) {
          setDeliveryOption(data.basketDetails.deliveryDetails.deliveryType);
        }
        if (data.basketDetails.deliveryDetails.providerDetails?.postnord?.servicePointId) {
          setSelectedPoint(
            data.basketDetails.deliveryDetails.providerDetails.postnord.servicePointId
          );
        }
      })
      .catch((error) => {
        console.error('Error fetching basket summary:', error);
      });
  }, [customerDetails, deliveryOption]);

  // Conditional rendering based on loading state
  if (!isBasketLoaded) {
    return <Loading />;
  }

  return (
    <div className="p-8 w-full max-w-screen-lg mx-auto">
      {basketItems.length === 0 ? (
        <p>Din kurv er tom. Du bliver omdirigeret til forsiden.</p>
      ) : (
        <>
          {/* Render basket items */}
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

          {/* Total Price Summary Card */}
          <div className="mb-4 p-4 border rounded">
            <h2 className="text-xl font-bold">Sammendrag</h2>
            <p className="text-gray-700 mt-2">
              Total pris for pakker: {(totalPrice / 100).toFixed(2)} kr
            </p>
            <p className="text-gray-700 mt-2">
              Pant: {(totalRecyclingFee / 100).toFixed(2)} kr
            </p>
            <p className="text-gray-700 mt-2 font-bold">
              Samlet pris: {((totalPrice + totalRecyclingFee) / 100).toFixed(2)} kr
            </p>
          </div>

          {/* Render customer details */}
          <CustomerDetails
            customerDetails={customerDetails}
            updateCustomerDetails={updateCustomerDetails}
            updateDeliveryDetailsInBackend={updateDeliveryDetailsInBackend}
          />

          {/* Render shipping and payment */}
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

          {/* Render order confirmation */}
          <OrderConfirmation
            customerDetails={customerDetails}
            deliveryOption={deliveryOption}
            selectedPoint={selectedPoint}
            updateDeliveryDetailsInBackend={updateDeliveryDetailsInBackend}
            totalPrice={totalPrice}
            totalRecyclingFee={totalRecyclingFee}
            basketItems={basketItems}
          />
        </>
      )}
    </div>
  );
}
