// pages/basket.js

import { useState, useEffect } from 'react';
import router from 'next/router';
import { useBasket } from '../components/BasketContext';
import PickupPointsList from '../components/PickupPointsList';
import MapComponent from '../components/MapComponent';
import LoadingSpinner from '../components/LoadingSpinner';
import BannerSteps from '../components/BannerSteps';
import Loading from '../components/Loading';
import LoadingButton from '../components/LoadingButton';
import { getCookie } from '../lib/cookies';
import ExplosionEffect from '../components/ExplosionEffect';

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
  const [showPickupPoints, setShowPickupPoints] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [packagesData, setPackagesData] = useState({});
  const [explodedItems, setExplodedItems] = useState({});
  // State for step management
  const [currentStep, setCurrentStep] = useState(1);

  // State for terms acceptance
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState('');

  // State for delivery option
  const [deliveryOption, setDeliveryOption] = useState('pickup'); // 'pickup' or 'homeDelivery'

  // State for expanded items
  const [expandedItems, setExpandedItems] = useState({});

  // State for drinks data
  const [drinksData, setDrinksData] = useState({});

  // Loading states for buttons
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [isProceedingToShipping, setIsProceedingToShipping] = useState(false);
  const [isProceedingToConfirmation, setIsProceedingToConfirmation] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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

  // Add the useEffect that triggers address validation when currentStep changes
  useEffect(() => {
    if (deliveryOption === 'pickup') {
      if (currentStep === 3) {
        setLoading(true);
        validateAddressWithDAWA();
      }
    } else {
      setLoading(false);
      // Reset pickup points when not pickup
      setPickupPoints([]);
      setSelectedPoint(null);
    }
  }, [deliveryOption, currentStep]);

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

  const triggerExplosion = (itemIndex) => {
    setExplodedItems((prev) => ({
      ...prev,
      [itemIndex]: true,
    }));
  };

  const updateCustomerDetailsInFirebase = async (updatedDetails) => {
    try {
      await fetch('/api/firebase/4-updateBasket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateCustomerDetails',
          customerDetails: updatedDetails,
        }),
      });
    } catch (error) {
      console.error('Error updating customer details in Firebase:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const updatedDetails = { ...customerDetails, [name]: value };
    updateCustomerDetails(updatedDetails); // This updates the context

    // Save to Firebase
    updateCustomerDetailsInFirebase(updatedDetails);

    // Additional logic for postal code
    if (name === 'postalCode' && value.length === 4 && /^\d{4}$/.test(value)) {
      fetch(`https://api.dataforsyningen.dk/postnumre/${value}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          updateCustomerDetails({ ...updatedDetails, city: data.navn || '' });
          updateCustomerDetailsInFirebase({ ...updatedDetails, city: data.navn || '' });
        })
        .catch((error) => {
          console.error('Error fetching city name:', error);
          updateCustomerDetails({ ...updatedDetails, city: '' });
          updateCustomerDetailsInFirebase({ ...updatedDetails, city: '' });
        });
    }
  };

  const removeItem = (itemIndex) => {
    removeItemFromBasket(itemIndex);
  };

  const updateQuantity = (itemIndex, newQuantity) => {
    updateItemQuantity(itemIndex, newQuantity);
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

  const fetchPickupPoints = (updatedDetails) => {
    const { streetName, streetNumber } = splitAddress(updatedDetails.address);
    if (updatedDetails.city && updatedDetails.postalCode && streetNumber) {
      fetch(
        `/api/postnord/servicepoints?city=${encodeURIComponent(
          updatedDetails.city
        )}&postalCode=${encodeURIComponent(
          updatedDetails.postalCode
        )}&streetName=${encodeURIComponent(
          streetName
        )}&streetNumber=${encodeURIComponent(streetNumber)}`
      )
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

  const validateAddressWithDAWA = async () => {
    setIsValidatingAddress(true);
    try {
      const response = await fetch('/api/dawa/datavask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerDetails),
      });

      if (!response.ok) {
        throw new Error(`DAWA validation failed with status ${response.status}`);
      }

      const data = await response.json();

      if (
        !data ||
        !data.dawaResponse ||
        !data.dawaResponse.resultater ||
        data.dawaResponse.resultater.length === 0
      ) {
        throw new Error('DAWA returned no results');
      }

      const bestResult = data.dawaResponse.resultater[0].adresse;

      const updatedDetails = {
        ...customerDetails,
        address: `${bestResult.vejnavn} ${bestResult.husnr}`,
        postalCode: bestResult.postnr,
        city: bestResult.postnrnavn,
      };

      updateCustomerDetails(updatedDetails);
      updateCustomerDetailsInFirebase(updatedDetails);

      // Fetch pickup points after DAWA validation
      fetchPickupPoints(updatedDetails);
    } catch (error) {
      console.error('Error validating address with DAWA:', error);
      setErrors((prevErrors) => ({
        ...prevErrors,
        address: 'Adressevalidering fejlede. Tjek venligst dine oplysninger.',
      }));
      setLoading(false);
    } finally {
      setIsValidatingAddress(false);
    }
  };

  // Modify this function to match the working code
  const handleShowShippingOptions = () => {
    const newErrors = {};
    if (!customerDetails.fullName) newErrors.fullName = 'Fulde navn er påkrævet';
    if (!customerDetails.mobileNumber) newErrors.mobileNumber = 'Mobilnummer er påkrævet';
    if (!customerDetails.email) newErrors.email = 'E-mail er påkrævet';
    if (!customerDetails.address) newErrors.address = 'Adresse er påkrævet';
    if (!customerDetails.postalCode) newErrors.postalCode = 'Postnummer er påkrævet';
    if (!customerDetails.city) newErrors.city = 'By er påkrævet';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    } else {
      setErrors({});
    }

    // Move to the next step
    setCurrentStep(3);
  };

  const handleProceedToConfirmation = () => {
    if (deliveryOption === 'pickup') {
      if (!selectedPoint) {
        alert('Vælg venligst et afhentningssted.');
        return;
      }
    }

    // Move to the next step
    setCurrentStep(4);
  };

  const handlePayment = async () => {
    if (!termsAccepted) {
      setTermsError(
        'Du skal acceptere vores forretningsvilkår før du kan fortsætte, sæt flueben i boksen herover.'
      );
      return;
    }

    setIsProcessingPayment(true);
    try {
      // Prepare deliveryAddress
      let deliveryAddress = {};

      if (deliveryOption === 'pickup') {
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
        const { streetName, streetNumber } = splitAddress(customerDetails.address);
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

  const handleStepChange = (step) => {
    // Prevent users from accessing steps they shouldn't
    if (step > currentStep) return;

    // If moving back to step 2, reset steps 3 and 4
    if (step <= 2) {
      setDeliveryOption('pickup');
      setSelectedPoint(null);
      setShowPickupPoints(false);
      setTermsAccepted(false);
      setTermsError('');
      setPickupPoints([]); // Reset pickupPoints to ensure re-fetching
    }

    setCurrentStep(step);
  };

  // Function to toggle expansion of a basket item
  const toggleExpand = (index) => {
    setExpandedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Render functions for each step
  const renderCustomerDetails = () => {
    return (
      <>
        <h2 className="text-2xl font-bold mb-4">Kundeoplysninger</h2>
        <form>
          {/* Full Name */}
          <div className="mb-4">
            <label className="block text-gray-700">Fulde navn</label>
            <input
              type="text"
              name="fullName"
              value={customerDetails.fullName || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded"
            />
            {errors.fullName && <p className="text-red-600">{errors.fullName}</p>}
          </div>

          {/* Mobile Number */}
          <div className="mb-4">
            <label className="block text-gray-700">Mobilnummer</label>
            <input
              type="text"
              name="mobileNumber"
              value={customerDetails.mobileNumber || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded"
            />
            {errors.mobileNumber && <p className="text-red-600">{errors.mobileNumber}</p>}
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="block text-gray-700">E-mail</label>
            <input
              type="email"
              name="email"
              value={customerDetails.email || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded"
            />
            {errors.email && <p className="text-red-600">{errors.email}</p>}
          </div>

          {/* Address */}
          <div className="mb-4">
            <label className="block text-gray-700">Adresse</label>
            <input
              type="text"
              name="address"
              value={customerDetails.address || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded"
            />
            {errors.address && <p className="text-red-600">{errors.address}</p>}
          </div>

          {/* Postal Code */}
          <div className="mb-4">
            <label className="block text-gray-700">Postnummer</label>
            <input
              type="text"
              name="postalCode"
              value={customerDetails.postalCode || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded"
            />
            {errors.postalCode && <p className="text-red-600">{errors.postalCode}</p>}
          </div>

          {/* City */}
          <div className="mb-4">
            <label className="block text-gray-700">By</label>
            <input
              type="text"
              name="city"
              value={customerDetails.city || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded"
            />
            {errors.city && <p className="text-red-600">{errors.city}</p>}
          </div>

          {/* Country */}
          <div className="mb-4">
            <label className="block text-gray-700">Land</label>
            <input
              type="text"
              name="country"
              value={customerDetails.country || 'Danmark'}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded"
              disabled
            />
          </div>

          {/* Buttons */}
          <div className="mt-4 flex justify-between">
            <LoadingButton
              onClick={() => setCurrentStep(1)}
              className="bg-gray-500 text-white px-6 py-2 rounded-full shadow hover:bg-gray-600 transition"
            >
              Tilbage
            </LoadingButton>
            <LoadingButton
              onClick={handleShowShippingOptions}
              className="bg-blue-500 text-white px-6 py-2 rounded-full shadow hover:bg-blue-600 transition"
            >
              Næste: Vælg levering
            </LoadingButton>
          </div>
        </form>
      </>
    );
  };

  const renderShippingAndPayment = () => {
    return (
      <>
        <h2 className="text-2xl font-bold mb-4">Leveringsmuligheder</h2>
        {/* Delivery Options */}
        <div className="mt-4">
          <label className="mr-4">
            <input
              type="radio"
              name="deliveryOption"
              value="pickup"
              checked={deliveryOption === 'pickup'}
              onChange={() => setDeliveryOption('pickup')}
            />
            Afhentningssted
          </label>
          <label>
            <input
              type="radio"
              name="deliveryOption"
              value="homeDelivery"
              checked={deliveryOption === 'homeDelivery'}
              onChange={() => setDeliveryOption('homeDelivery')}
            />
            Hjemmelevering
          </label>
        </div>

        {loading && <LoadingSpinner />}

        {deliveryOption === 'pickup' && !loading && selectedPoint && (
          <>
            <h3 className="text-xl font-bold mt-4">Vælg Afhentningssted</h3>
            <PickupPointsList
              pickupPoints={pickupPoints}
              selectedPoint={selectedPoint}
              setSelectedPoint={setSelectedPoint}
            />
            <MapComponent
              pickupPoints={pickupPoints}
              selectedPoint={selectedPoint}
              setSelectedPoint={setSelectedPoint}
            />
          </>
        )}

        <div className="mt-4 flex justify-between">
          <LoadingButton
            onClick={() => handleStepChange(2)}
            className="bg-gray-500 text-white px-6 py-2 rounded-full shadow hover:bg-gray-600 transition"
          >
            Tilbage
          </LoadingButton>
          <LoadingButton
            onClick={handleProceedToConfirmation}
            className="bg-blue-500 text-white px-6 py-2 rounded-full shadow hover:bg-blue-600 transition"
          >
            Næste: Bekræft ordre
          </LoadingButton>
        </div>
      </>
    );
  };

  const renderOrderConfirmation = () => {
    return (
      <>
        <h2 className="text-2xl font-bold mb-4">Bekræft Ordre</h2>
        {/* Order Summary */}
        {/* ... Display order summary here ... */}

        {/* Terms and Conditions */}
        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                setTermsError('');
              }}
            />
            <span className="ml-2">
              Jeg accepterer{' '}
              <a href="/handelsbetingelser" target="_blank" className="text-blue-500 underline">
                handelsbetingelserne
              </a>
            </span>
          </label>
          {termsError && <p className="text-red-600">{termsError}</p>}
        </div>

        <div className="mt-4 flex justify-between">
          <LoadingButton
            onClick={() => handleStepChange(3)}
            className="bg-gray-500 text-white px-6 py-2 rounded-full shadow hover:bg-gray-600 transition"
          >
            Tilbage
          </LoadingButton>
          <LoadingButton
            onClick={handlePayment}
            loading={isProcessingPayment}
            className="bg-green-500 text-white px-6 py-2 rounded-full shadow hover:bg-green-600 transition"
          >
            Gå til betaling
          </LoadingButton>
        </div>
      </>
    );
  };

  // Conditional rendering based on loading state
  if (!isBasketLoaded) {
    return <Loading />;
  }

  return (
    <div className="p-8 w-full max-w-screen-lg mx-auto">
      <BannerSteps currentStep={currentStep} onStepChange={handleStepChange} />

      {basketItems.length === 0 ? (
        <p>Din kurv er tom. Du bliver omdirigeret til forsiden.</p>
      ) : (
        <>
          {currentStep === 1 && (
            <>
              <h1 className="text-3xl font-bold mb-8">Min Kurv</h1>
              {basketItems.map((item, index) => {
                const isExpanded = expandedItems[index];
                const packageData = packagesData[item.slug];
                const packageImage = packageData?.image;

                return (
                  <ExplosionEffect
                    key={index}
                    trigger={explodedItems[index]}
                    onComplete={() => removeItem(index)}
                  >
                    <div className="mb-4 p-4 border rounded relative">
                      <button
                        onClick={() => triggerExplosion(index)}
                        className="text-red-600 absolute top-2 right-2"
                      >
                        Fjern
                      </button>
                      <div className="flex flex-col md:flex-row items-start">
                        <img
                          src={packageImage}
                          alt={item.slug}
                          className="w-24 h-24 object-cover rounded"
                        />
                        <div className="flex-1 mt-4 md:mt-0 md:ml-4">
                          <h2 className="text-xl font-bold">{packageData?.title || item.slug}</h2>
                          {/* Quantity controls */}
                          <div className="flex items-center mt-2">
                            <button
                              onClick={() => updateQuantity(index, item.quantity - 1)}
                              className="px-2 py-1 bg-gray-200 rounded-l"
                            >
                              -
                            </button>
                            <span className="px-4 py-2 bg-gray-100">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(index, item.quantity + 1)}
                              className="px-2 py-1 bg-gray-200 rounded-r"
                            >
                              +
                            </button>
                          </div>
                          {/* Item details */}
                          <p className="text-gray-700 mt-2">
                            Pris pr. pakke: {(item.pricePerPackage / 100).toFixed(2)} kr
                          </p>
                          <p className="text-gray-700 mt-2">
                            Totalpris: {(item.totalPrice / 100).toFixed(2)} kr (pant{' '}
                            {(item.totalRecyclingFee / 100).toFixed(2)} kr)
                          </p>
                          <p className="text-gray-700 mt-2">
                            Pakke størrelse: {item.packages_size}
                          </p>
                          <p className="text-gray-700 mt-2">
                            Sukker præference: {item.sugarPreference || 'Ikke valgt'}
                          </p>
                          <button
                            onClick={() => toggleExpand(index)}
                            className="mt-2 text-blue-600"
                          >
                            {isExpanded ? 'Skjul detaljer' : 'Vis detaljer'}
                          </button>
                        </div>
                      </div>
                      {/* Expanded item details */}
                      {isExpanded && (
                        <div className="mt-4">
                          {item.selectedDrinks &&
                            Object.keys(item.selectedDrinks).map((drinkSlug) => (
                              <div key={drinkSlug} className="flex items-center mt-2">
                                <img
                                  src={drinksData[drinkSlug]?.image}
                                  alt={drinksData[drinkSlug]?.name}
                                  className="w-12 h-12 object-cover mr-4"
                                />
                                <span>{drinksData[drinkSlug]?.name}</span>
                                <span className="ml-auto">
                                  Antal: {item.selectedDrinks[drinkSlug]}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </ExplosionEffect>
                );
              })}
              {/* Proceed to next step */}
              <div className="text-right mt-4">
                <LoadingButton
                  onClick={() => setCurrentStep(2)}
                  className="bg-blue-500 text-white px-6 py-2 rounded-full shadow hover:bg-blue-600 transition"
                >
                  Næste: Kundeoplysninger
                </LoadingButton>
              </div>
            </>
          )}

          {/* Render other steps */}
          {currentStep === 2 && renderCustomerDetails()}
          {currentStep === 3 && renderShippingAndPayment()}
          {currentStep === 4 && renderOrderConfirmation()}
        </>
      )}
    </div>
  );
}
