// pages/basket.js
import { useState, useEffect } from 'react';
import router from 'next/router';
import { useBasket } from '../components/BasketContext';
import PickupPointsList from '../components/PickupPointsList';
import MapComponent from '../components/MapComponent';
import LoadingSpinner from '../components/LoadingSpinner';
import BannerSteps from '../components/BannerSteps';
import Loading from '../components/Loading';
import { getCookie } from '../lib/cookies';

export default function Basket() {
  const {
    basketItems,
    removeItemFromBasket,
    updateItemQuantity,
    customerDetails,
    updateCustomerDetails,
  } = useBasket();

  const [errors, setErrors] = useState({});
  const [pickupPoints, setPickupPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPickupPoints, setShowPickupPoints] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [packagesData, setPackagesData] = useState({});


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
    if (basketItems.length === 0) {
      const timer = setTimeout(() => {
        router.push('/');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [basketItems, router]);

  useEffect(() => {
    if (deliveryOption === 'pickup') {
      setLoading(true);
      validateAddressWithDAWA();
    } else {
      setLoading(false);
      // Reset pickup points when not pickup
      setPickupPoints([]);
      setSelectedPoint(null);
    }
  }, [deliveryOption]);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const updatedDetails = { ...customerDetails, [name]: value };
    updateCustomerDetails(updatedDetails);

    if (name === 'postalCode' && value.length === 4 && /^\d{4}$/.test(value)) {
      fetch(`https://api.dataforsyningen.dk/postnumre/${value}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          updateCustomerDetails({ ...updatedDetails, city: data.navn || '' });
        })
        .catch((error) => {
          console.error('Error fetching city name:', error);
          updateCustomerDetails({ ...updatedDetails, city: '' });
        });
    }
  };


  const removeItem = async (itemIndex) => {
    try {
      const response = await fetch('/api/firebase/4-updateBasket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'removeItem', itemIndex }),
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        removeItemFromBasket(itemIndex);
      } else {
        console.error('Error removing item:', data.error);
      }
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };


  // Updated updateQuantity function to include API call
  const updateQuantity = async (itemIndex, newQuantity) => {
    try {
      const response = await fetch('/api/firebase/4-updateBasket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateQuantity', itemIndex, quantity: newQuantity }),
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        updateItemQuantity(itemIndex, newQuantity);
      } else {
        console.error('Error updating item quantity:', data.error);
      }
    } catch (error) {
      console.error('Error updating item quantity:', error);
    }
  };

  const fetchPickupPoints = (updatedDetails) => {
    if (updatedDetails.city && updatedDetails.postalCode && updatedDetails.streetNumber) {
      fetch(
        `/api/postnord/servicepoints?city=${updatedDetails.city}&postalCode=${updatedDetails.postalCode}&streetName=${updatedDetails.address}&streetNumber=${updatedDetails.streetNumber}`
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
    try {
      const response = await fetch('/api/dawa/datavask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerDetails),
      });

      const data = await response.json();
      const updatedDetails = {
        ...customerDetails,
        streetNumber: data.dawaResponse.resultater[0].adresse.husnr,
        address: data.dawaResponse.resultater[0].adresse.vejnavn,
        postalCode: data.dawaResponse.resultater[0].adresse.postnr,
        city: data.dawaResponse.resultater[0].adresse.postnrnavn,
      };

      updateCustomerDetails(updatedDetails);

      // Fetch pickup points after DAWA validation
      fetchPickupPoints(updatedDetails);
    } catch (error) {
      console.error('Error validating address with DAWA:', error);
    } finally {
      setLoading(false); // Ensure loading is set to false
    }
  };

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

    // setLoading(true);
    // validateAddressWithDAWA();
    setShowPickupPoints(true);
    // Move to the next step
    setCurrentStep(3);
  };

  const handleProceedToConfirmation = () => {
    // Ensure that the required data is available before proceeding to confirmation
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
          country: customerDetails.country,
        };
      } else if (deliveryOption === 'homeDelivery') {
        // Use sanitized customer address
        deliveryAddress = {
          name: customerDetails.fullName,
          streetName: customerDetails.address,
          streetNumber: customerDetails.streetNumber,
          postalCode: customerDetails.postalCode,
          city: customerDetails.city,
          country: customerDetails.country,
        };
      }


      const cookieConsentId = getCookie('cookie_consent_id');

      // Step 1: Create Order
      const orderResponse = await fetch('/api/createOrder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookieConsentId }),
      });

      const { orderId, totalPrice } = await orderResponse.json();

      // Step 2: Create Payment
      const paymentResponse = await fetch('/api/createPayment', {
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

  const renderCustomerDetails = () => (
    <div>
      <h2 className="text-2xl font-bold mb-4">Kundeoplysninger</h2>

      {/* Customer Details Form */}
      <div className="mb-4">
        <label className="block mb-2">Fulde Navn *</label>
        <input
          type="text"
          name="fullName"
          value={customerDetails.fullName}
          onChange={handleInputChange}
          className={`w-full p-2 border rounded ${errors.fullName ? 'border-red-500' : ''}`}
          required
        />
        {errors.fullName && <p className="text-red-500 mt-1">{errors.fullName}</p>}
      </div>

      <div className="mb-4">
        <label className="block mb-2">Mobilnummer *</label>
        <input
          type="text"
          name="mobileNumber"
          value={customerDetails.mobileNumber}
          onChange={handleInputChange}
          className={`w-full p-2 border rounded ${errors.mobileNumber ? 'border-red-500' : ''}`}
          required
        />
        {errors.mobileNumber && <p className="text-red-500 mt-1">{errors.mobileNumber}</p>}
      </div>

      <div className="mb-4">
        <label className="block mb-2">E-mail Adresse *</label>
        <input
          type="email"
          name="email"
          value={customerDetails.email}
          onChange={handleInputChange}
          className={`w-full p-2 border rounded ${errors.email ? 'border-red-500' : ''}`}
          required
        />
        {errors.email && <p className="text-red-500 mt-1">{errors.email}</p>}
      </div>

      <div className="mb-4">
        <label className="block mb-2">Vejnavn og Husnummer *</label>
        <input
          type="text"
          name="address"
          value={customerDetails.address}
          onChange={handleInputChange}
          className={`w-full p-2 border rounded ${errors.address ? 'border-red-500' : ''}`}
          required
        />
        {errors.address && <p className="text-red-500 mt-1">{errors.address}</p>}
      </div>

      <div className="mb-4">
        <label className="block mb-2">Postnummer *</label>
        <input
          type="text"
          name="postalCode"
          value={customerDetails.postalCode}
          onChange={handleInputChange}
          className={`w-full p-2 border rounded ${errors.postalCode ? 'border-red-500' : ''}`}
          required
        />
        {errors.postalCode && <p className="text-red-500 mt-1">{errors.postalCode}</p>}
      </div>

      <div className="mb-4">
        <label className="block mb-2">By *</label>
        <input
          type="text"
          name="city"
          value={customerDetails.city}
          onChange={handleInputChange}
          className={`w-full p-2 border rounded ${errors.city ? 'border-red-500' : ''}`}
          required
          disabled={true}
        />
        {errors.city && <p className="text-red-500 mt-1">{errors.city}</p>}
      </div>

      <button
        onClick={handleShowShippingOptions}
        className="mt-6 bg-blue-500 text-white px-6 py-2 rounded-full shadow hover:bg-blue-600 transition"
      >
        Næste: Fragt og levering
      </button>
    </div>
  );

  const renderShippingAndPayment = () => (
    <div>
      <h2 className="text-2xl font-bold mb-4">Fragt og levering</h2>
      <div className="mb-4">
        <p>Leveringsmuligheder Post Nord</p>
        <label className="block">
          <input
            type="radio"
            name="deliveryOption"
            value="pickup"
            checked={deliveryOption === 'pickup'}
            onChange={() => setDeliveryOption('pickup')}
          />
          <span className="ml-2">
            Privatpakke Collect uden omdeling - Vælg selv udleveringssted (39,00 kr.)
          </span>
        </label>
        <label className="block">
          <input
            type="radio"
            name="deliveryOption"
            value="homeDelivery"
            checked={deliveryOption === 'homeDelivery'}
            onChange={() => setDeliveryOption('homeDelivery')}
          />
          <span className="ml-2">Privatpakke Home med omdeling (49,00 kr.)</span>
        </label>
      </div>

      {deliveryOption === 'pickup' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center">
                <LoadingSpinner />
                <p className="mt-4 font-bold">Henter afhentningssteder</p>
              </div>
            </div>
          ) : (
            showPickupPoints && (
              <div className="mt-8">
                <div className="flex flex-col lg:flex-row justify-between space-y-4 lg:space-y-0 lg:space-x-4">
                  <div
                    className="w-full lg:w-1/2 overflow-y-scroll"
                    style={{ maxHeight: '545px' }}
                  >
                    <h2 className="text-xl font-bold mb-4">Vælg et afhentningssted</h2>
                    <PickupPointsList
                      pickupPoints={pickupPoints}
                      selectedPoint={selectedPoint}
                      setSelectedPoint={setSelectedPoint}
                    />
                  </div>
                  <div className="w-full lg:w-1/2" style={{ height: '545px' }}>
                    <MapComponent
                      pickupPoints={pickupPoints}
                      selectedPoint={selectedPoint}
                      setSelectedPoint={setSelectedPoint}
                    />
                  </div>
                </div>
              </div>
            )
          )}
        </>
      )}

      <div className="text-right mt-4">
        <button
          onClick={handleProceedToConfirmation}
          className="bg-blue-500 text-white px-6 py-2 rounded-full shadow hover:bg-blue-600 transition"
        >
          Næste: Godkend din ordre
        </button>
      </div>
    </div>
  );

  const renderOrderConfirmation = () => {
    const totalPrice = basketItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
    const shippingCost = deliveryOption === 'pickup' ? 3900 : 4900; // 39.00 or 49.00 DKK
    const totalPriceWithShipping = totalPrice + shippingCost;
    const vatAmount = totalPriceWithShipping * 0.25; // 25% VAT

    // Prepare invoice address using customer's original input
    const invoiceAddress = `${customerDetails.fullName}
  ${customerDetails.address}
  ${customerDetails.postalCode} ${customerDetails.city}
  ${customerDetails.country}
  ${customerDetails.email}`;

    // Prepare delivery address based on delivery option
    let deliveryAddressText = '';
    if (deliveryOption === 'pickup') {
      // Use the sanitized address from DAWA and selected pickup point
      const selectedPickupPoint = pickupPoints.find(
        (point) => point.servicePointId === selectedPoint
      );
      deliveryAddressText = selectedPickupPoint
        ? `${selectedPickupPoint.name}
  ${customerDetails.fullName}
  ${selectedPickupPoint.visitingAddress.streetName} ${selectedPickupPoint.visitingAddress.streetNumber}
  ${selectedPickupPoint.visitingAddress.postalCode} ${selectedPickupPoint.visitingAddress.city.toUpperCase()}
  ${customerDetails.country}`
        : '';
    } else if (deliveryOption === 'homeDelivery') {
      // Use the user's original address as typed, including apartment number
      deliveryAddressText = `${customerDetails.fullName}
  ${customerDetails.address}
  ${customerDetails.postalCode} ${customerDetails.city}
  ${customerDetails.country}`;
    }

    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">Godkend din ordre</h2>

        {/* Order Summary */}
        <div className="mb-4">
          <h3 className="font-bold">Fakturaadresse</h3>
          <pre>{invoiceAddress}</pre>
        </div>

        <div className="mb-4">
          <h3 className="font-bold">Leveringsadresse</h3>
          <pre>{deliveryAddressText}</pre>
        </div>

        <div className="mb-4">
          <h3 className="font-bold">Betalingsmetode</h3>
          <p>Kreditkort, Viabill, Apple Pay, Google Pay, Klarna eller MobilePay</p>
        </div>

        <div className="mb-4">
          <h3 className="font-bold">Leveringsmetode</h3>
          {deliveryOption === 'pickup' ? (
            <p>Privatpakke Collect uden omdeling - Vælg selv udleveringssted</p>
          ) : (
            <p>Privatpakke Home med omdeling</p>
          )}
        </div>

        <div className="mb-4">
          <h3 className="font-bold">Produkter</h3>
          {basketItems.map((item, index) => (
            <div key={index} className="flex justify-between">
              <p>
                {item.quantity} × {item.title}
              </p>
              <p>{((item.price * item.quantity) / 100).toFixed(2)} kr.</p>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <p>Varer i alt: {(totalPrice / 100).toFixed(2)} kr.</p>
          <p>Fragt: {(shippingCost / 100).toFixed(2)} kr.</p>
          <p>Heraf moms 25%: {((vatAmount) / 100).toFixed(2)} kr.</p>
          <p>
            <strong>
              Total inkl. moms: {(totalPriceWithShipping / 100).toFixed(2)} kr.
            </strong>
          </p>
        </div>

        {/* Terms and Conditions Checkbox */}
        <div className="mb-4 p-4 border rounded">
          <p>
            Jeg har læst og accepteret{' '}
            <a href="/handelsbetingelser" className="text-blue-500 underline">
              forretningsvilkår samt persondatapolitik
            </a>
            .
          </p>
          <div className="mt-2">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="form-checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  if (e.target.checked) setTermsError('');
                }}
              />
              <span className="ml-2">Accepter</span>
            </label>
          </div>
          {termsError && <p className="text-red-500 mt-1">{termsError}</p>}
        </div>

        <button
          onClick={handlePayment}
          className="mt-6 bg-red-500 text-white px-6 py-2 rounded-full shadow hover:bg-red-600 transition"
        >
          BETAL
        </button>
      </div>
    );
  };
  return (
    <div className="p-8 w-full max-w-screen-lg mx-auto">
      {/* Include the BannerSteps component */}
      <BannerSteps currentStep={currentStep} onStepChange={handleStepChange} />

      {basketItems.length === 0 ? (
        <Loading />
      ) : (
        <>
          {/* Step 1: Basket Items */}
          {currentStep === 1 && (
            <>
              <h1 className="text-3xl font-bold mb-8">Min Kurv</h1>
              {basketItems.map((item, index) => {
                const isExpanded = expandedItems[index];
                const packageData = packagesData[item.slug];
                const packageImage = packageData?.image;

                return (
                  <div
                    key={index}
                    className="mb-4 p-4 border rounded relative"
                  >
                    <button
                      onClick={() => removeItem(index)}
                      className="text-red-600 absolute top-0 right-0 mt-2 mr-2"
                    >
                      Fjern
                    </button>
                    <div className="flex flex-col md:flex-row items-start">
                      <img
                        src={packageImage || '/images/placeholder.jpg'}
                        alt={item.slug}
                        className="w-24 h-24 object-cover rounded"
                      />
                      <div className="flex-1 mt-4 md:mt-0 md:ml-4">
                        <h2 className="text-xl font-bold">{packageData?.title || item.slug}</h2>
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
                        <button onClick={() => toggleExpand(index)} className="mt-2 text-blue-600">
                          {isExpanded ? 'Skjul detaljer' : 'Vis detaljer'}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4">
                        {/* Display selected drinks */}
                        {item.selectedDrinks && Object.keys(item.selectedDrinks).map((drinkSlug) => (
                          <div key={drinkSlug} className="flex items-center mt-2">
                            <img
                              src={drinksData[drinkSlug]?.image}
                              alt={drinksData[drinkSlug]?.name}
                              className="w-12 h-12 object-cover mr-4"
                            />
                            <span>{drinksData[drinkSlug]?.name}</span>
                            <span className="ml-auto">Antal: {item.selectedDrinks[drinkSlug]}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                );
              })}
              <div className="text-right mt-4">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="bg-blue-500 text-white px-6 py-2 rounded-full shadow hover:bg-blue-600 transition"
                >
                  Næste: Kundeoplysninger
                </button>
              </div>
            </>
          )}

          {/* Step 2: Customer Details */}
          {currentStep === 2 && (
            <>
              {basketItems.length > 0 ? (
                renderCustomerDetails()
              ) : (
                <p>Du skal have mindst én vare i kurven.</p>
              )}
            </>
          )}

          {/* Step 3: Shipping and Payment */}
          {currentStep === 3 && (
            <>
              {customerDetails.fullName ? (
                renderShippingAndPayment()
              ) : (
                <p>Du skal udfylde kundeoplysninger først.</p>
              )}
            </>
          )}

          {/* Step 4: Order Confirmation */}
          {currentStep === 4 && (
            <>
              {deliveryOption === 'pickup' && !selectedPoint ? (
                <p>Du skal vælge et afhentningssted.</p>
              ) : (
                renderOrderConfirmation()
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}