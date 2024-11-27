// pages/basket.js

import { useState, useEffect, useRef, useCallback } from 'react';
import router from 'next/router';
import { useBasket } from '../components/BasketContext';
import Loading from '../components/Loading';
import { getCookie } from '../lib/cookies';
import ExplosionEffect from '../components/ExplosionEffect';

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

  const [errors, setErrors] = useState({});
  const [pickupPoints, setPickupPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [packagesData, setPackagesData] = useState({});
  const [explodedItems, setExplodedItems] = useState({});

  // State for terms acceptance
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState('');

  // State for delivery option
  const [deliveryOption, setDeliveryOption] = useState('pickupPoint');

  // State for expanded items
  const [expandedItems, setExpandedItems] = useState({});

  // State for drinks data
  const [drinksData, setDrinksData] = useState({});

  const [touchedFields, setTouchedFields] = useState({});

  // Loading states for buttons
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Compute total price and total recycling fee
  const totalPrice = basketItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalRecyclingFee = basketItems.reduce((sum, item) => sum + item.totalRecyclingFee, 0);

  // State for basket summary
  const [basketSummary, setBasketSummary] = useState(null);

  // Debounce function to prevent excessive API calls
  const debounce = (func, delay) => {
    let timeoutId;
    return function (...args) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  const allFieldsValid = () => {
    const requiredFields = ['fullName', 'mobileNumber', 'email', 'address', 'postalCode', 'city'];
    return requiredFields.every(
      (field) => !errors[field] && customerDetails[field] && customerDetails[field].trim()
    );
  };

  // Function to update delivery details in the backend
  const updateDeliveryDetailsInBackend = async (option = deliveryOption) => {
    try {
      let deliveryAddress = {};
      let providerDetails = {};

      if (option === 'pickupPoint') {
        if (selectedPoint) {
          const selectedPickupPoint = pickupPoints.find(
            (point) => point.servicePointId === selectedPoint
          );
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

  const debouncedUpdateDeliveryDetailsInBackend = useRef(
    debounce(updateDeliveryDetailsInBackend, 500)
  ).current;

  // Function to handle delivery option change
  const handleDeliveryOptionChange = (option) => {
    setDeliveryOption(option);
    updateDeliveryDetailsInBackend(option);
  };

  const removeItem = (itemIndex) => {
    removeItemFromBasket(itemIndex);
  };

  const updateQuantity = (itemIndex, newQuantity) => {
    updateItemQuantity(itemIndex, newQuantity);
  };

  const triggerExplosion = (itemIndex) => {
    setExplodedItems((prev) => ({
      ...prev,
      [itemIndex]: true,
    }));
  };

  // Function to handle selected pickup point change
  const handleSelectedPointChange = (newSelectedPoint) => {
    setSelectedPoint(newSelectedPoint);
    if (deliveryOption === 'pickupPoint') {
      updateDeliveryDetailsInBackend();
    }
  };

  // Function to toggle expansion of a basket item
  const toggleExpand = (index) => {
    setExpandedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Function to update customer details in Firebase
  const updateCustomerDetailsInFirebase = async (updatedDetails) => {
    try {
      console.log('Updating customer details in Firebase:', updatedDetails);
      const response = await fetch('/api/firebase/4-updateBasket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateCustomerDetails',
          customerDetails: updatedDetails,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle errors returned from the server
        setErrors(data.errors || {});
        throw new Error(data.error || 'Error updating customer details');
      } else {
        // Clear errors if any
        setErrors({});
      }
    } catch (error) {
      console.error('Error updating customer details in Firebase:', error);
    }
  };

  // Debounced function
  const debouncedUpdateCustomerDetailsInFirebase = useCallback(
    debounce(updateCustomerDetailsInFirebase, 1000),
    []
  );

  const validateField = (name, value) => {
    if (name === 'fullName') {
      if (!value || !value.trim()) {
        return 'Fulde navn er påkrævet';
      } else {
        return null;
      }
    } else if (name === 'mobileNumber') {
      const mobileNumberRegex = /^\d{8}$/;
      if (!value || !value.trim()) {
        return 'Mobilnummer er påkrævet';
      } else if (!mobileNumberRegex.test(value.trim())) {
        return 'Mobilnummer skal være 8 cifre';
      } else {
        return null;
      }
    } else if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!value || !value.trim()) {
        return 'E-mail er påkrævet';
      } else if (!emailRegex.test(value.trim())) {
        return 'E-mail format er ugyldigt';
      } else {
        return null;
      }
    } else if (name === 'address') {
      if (!value || !value.trim()) {
        return 'Adresse er påkrævet';
      } else {
        return null;
      }
    } else if (name === 'postalCode') {
      const postalCodeRegex = /^\d{4}$/;
      if (!value || !value.trim()) {
        return 'Postnummer er påkrævet';
      } else if (!postalCodeRegex.test(value.trim())) {
        return 'Postnummer skal være 4 cifre';
      } else {
        return null;
      }
    } else if (name === 'city') {
      if (!value || !value.trim()) {
        return 'By er påkrævet';
      } else {
        return null;
      }
    }
    return null;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const updatedDetails = { ...customerDetails, [name]: value };
    updateCustomerDetails(updatedDetails); // Updates the context

    // Perform client-side validation
    const error = validateField(name, value);
    setErrors((prevErrors) => ({ ...prevErrors, [name]: error }));
  };

  const handleInputBlur = (fieldName) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));

    // Get the updated customerDetails from context
    const updatedDetails = customerDetails;

    // Perform client-side validation
    const error = validateField(fieldName, updatedDetails[fieldName]);
    setErrors((prevErrors) => ({ ...prevErrors, [fieldName]: error }));

    // Make API call to update customer details
    debouncedUpdateCustomerDetailsInFirebase(updatedDetails);

    // If delivery option is homeDelivery, update delivery details
    if (deliveryOption === 'homeDelivery') {
      debouncedUpdateDeliveryDetailsInBackend();
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

  const handlePayment = async () => {
    // Validate customer details
    const newErrors = {};
    const requiredFields = ['fullName', 'mobileNumber', 'email', 'address', 'postalCode', 'city'];
    requiredFields.forEach((field) => {
      const error = validateField(field, customerDetails[field]);
      if (error) {
        newErrors[field] = error;
      }
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to the customer details section
      document.getElementById('customer-details').scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Validate delivery option
    if (deliveryOption === 'pickupPoint' && !selectedPoint) {
      alert('Vælg venligst et afhentningssted.');
      // Scroll to shipping section
      document.getElementById('shipping-and-payment').scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (!termsAccepted) {
      setTermsError(
        'Du skal acceptere vores forretningsvilkår før du kan fortsætte, sæt flueben i boksen herover.'
      );
      // Scroll to terms section
      document.getElementById('order-confirmation').scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setIsProcessingPayment(true);
    try {
      // Prepare deliveryAddress
      let deliveryAddress = {};

      if (deliveryOption === 'pickupPoint') {
        const selectedPickupPoint = pickupPoints.find(
          (point) => point.servicePointId === selectedPoint
        );
        deliveryAddress = {
          name: selectedPickupPoint.name,
          attention: customerDetails.fullName,
          streetName: selectedPickupPoint.visitingAddress.streetName,
          streetNumber: selectedPickupPoint.visitingAddress.streetNumber,
          postalCode: selectedPickupPoint.visitingAddress.postalCode,
          city: selectedPickupPoint.visitingAddress.city,
          country: 'Danmark',
        };
      } else if (deliveryOption === 'homeDelivery') {
        // Use sanitized customer address
        const { streetName, streetNumber } = splitAddress(customerDetails.address || '');
        deliveryAddress = {
          name: customerDetails.fullName,
          streetName: streetName,
          streetNumber: streetNumber,
          postalCode: customerDetails.postalCode,
          city: customerDetails.city,
          country: 'Danmark',
        };
      }

      const cookieConsentId = getCookie('cookie_consent_id');

      // Step 1: Create Order
      const orderResponse = await fetch('/api/firebase/createOrder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookieConsentId, deliveryAddress, customerDetails }),
      });

      const { orderId, totalPrice } = await orderResponse.json();

      // Step 2: Create Payment
      const paymentResponse = await fetch('/api/firebase/createPayment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, totalPrice }),
      });

      const paymentData = await paymentResponse.json();

      if (paymentData.url) {
        // Redirect to Quickpay payment link
        window.location.href = paymentData.url;
      } else {
        // Handle error
        console.error('Error initiating payment:', paymentData);
        alert('Der opstod en fejl under betalingsprocessen. Prøv igen senere.');
      }
    } catch (error) {
      console.error('Error during payment process:', error);
      alert('Der opstod en fejl under betalingsprocessen. Prøv igen senere.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const fetchPickupPoints = (updatedDetails) => {
    const { streetName, streetNumber } = splitAddress(updatedDetails.address || '');
    if (updatedDetails.city && updatedDetails.postalCode) {
      let url = `/api/postnord/servicepoints?city=${encodeURIComponent(
        updatedDetails.city
      )}&postalCode=${encodeURIComponent(updatedDetails.postalCode)}`;

      if (streetName) {
        url += `&streetName=${encodeURIComponent(streetName)}`;
      }
      if (streetNumber) {
        url += `&streetNumber=${encodeURIComponent(streetNumber)}`;
      }

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          const points = data.servicePointInformationResponse?.servicePoints || [];
          setPickupPoints(points);
          // Set default selected pickup point
          if (points.length > 0) {
            setSelectedPoint(points[0].servicePointId);
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching PostNord service points:', error);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
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

  // Fetch basket summary
  useEffect(() => {
    // Fetch basket summary
    fetch('/api/firebase/5-getBasket')
      .then((res) => res.json())
      .then((data) => {
        setBasketSummary(data.basketDetails);
      })
      .catch((error) => {
        console.error('Error fetching basket summary:', error);
      });
  }, []);

  useEffect(() => {
    updateDeliveryDetailsInBackend();
  }, [deliveryOption]);

  useEffect(() => {
    if (!customerDetails) return; // Ensure customerDetails is available

    const fields = ['fullName', 'mobileNumber', 'email', 'address', 'postalCode', 'city'];
    const newTouchedFields = {};
    const newErrors = {};

    fields.forEach((field) => {
      const value = customerDetails[field];
      if (value !== undefined && value !== null && value !== '') {
        newTouchedFields[field] = true;
        const error = validateField(field, value);
        if (error) {
          newErrors[field] = error;
        }
      }
    });

    setTouchedFields((prev) => ({ ...prev, ...newTouchedFields }));
    setErrors((prev) => ({ ...prev, ...newErrors }));
  }, [customerDetails]); // Run whenever customerDetails changes

  useEffect(() => {
    if (deliveryOption === 'pickupPoint' && !errors.postalCode) {
      fetchPickupPoints(customerDetails);
    }
  }, [customerDetails.postalCode, deliveryOption]);

  useEffect(() => {
    if (deliveryOption === 'pickupPoint') {
      setLoading(true);
    } else {
      setPickupPoints([]);
      setSelectedPoint(null);
    }
  }, [deliveryOption]);

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
            handleInputChange={handleInputChange}
            handleInputBlur={handleInputBlur}
            touchedFields={touchedFields}
            errors={errors}
            allFieldsValid={allFieldsValid}
          />

          {/* Render shipping and payment */}
          <div className="mb-4">
            <ShippingAndPayment
              deliveryOption={deliveryOption}
              handleDeliveryOptionChange={handleDeliveryOptionChange}
              pickupPoints={pickupPoints}
              selectedPoint={selectedPoint}
              handleSelectedPointChange={handleSelectedPointChange}
              loading={loading}
            />
          </div>

          {/* Render order confirmation */}
          <OrderConfirmation
            basketSummary={basketSummary}
            termsAccepted={termsAccepted}
            setTermsAccepted={setTermsAccepted}
            termsError={termsError}
            handlePayment={handlePayment}
            isProcessingPayment={isProcessingPayment}
            setTermsError={setTermsError}
          />
        </>
      )}
    </div>
  );
}
