import { useState, useEffect } from 'react';
import router from 'next/router';
import { useBasket } from '../components/BasketContext';
import PickupPointsList from '../components/PickupPointsList';
import MapComponent from '../components/MapComponent';
import LoadingSpinner from '../components/LoadingSpinner';
import BannerSteps from '../components/BannerSteps'; // Import the BannerSteps component

export default function Basket() {
  const {
    basketItems,
    removeItemFromBasket,
    customerDetails,
    updateCustomerDetails,
    updateItemQuantity,
  } = useBasket();

  const [errors, setErrors] = useState({});
  const [pickupPoints, setPickupPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPickupPoints, setShowPickupPoints] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);

  // New state for step management
  const [currentStep, setCurrentStep] = useState(1);

  // New state for terms acceptance
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState('');

  useEffect(() => {
    if (basketItems.length === 0) {
      const timer = setTimeout(() => {
        router.push('/');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [basketItems, router]);

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

  const fetchPickupPoints = (updatedDetails) => {
    if (updatedDetails.city && updatedDetails.postalCode && updatedDetails.streetNumber) {
      fetch(
        `/api/postnord/servicepoints?city=${updatedDetails.city}&postalCode=${updatedDetails.postalCode}&streetName=${updatedDetails.address}&streetNumber=${updatedDetails.streetNumber}`
      )
        .then((res) => res.json())
        .then((data) => {
          setPickupPoints(data.servicePointInformationResponse?.servicePoints || []);
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
      };

      updateCustomerDetails(updatedDetails);
      fetchPickupPoints(updatedDetails);
    } catch (error) {
      console.error('Error validating address with DAWA:', error);
      setLoading(false);
    }
  };

  const handleShowPickupPoints = () => {
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

    setLoading(true);
    validateAddressWithDAWA();
    setShowPickupPoints(true);
    // Move to the next step
    setCurrentStep(3);
  };

  const handleProceedToConfirmation = () => {
    if (!selectedPoint) {
      alert('Vælg venligst et afhentningssted.');
      return;
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
      const selectedPickupPoint = pickupPoints.find(
        (point) => point.servicePointId === selectedPoint
      );
      const deliveryAddress = {
        name: selectedPickupPoint.name,
        attention: customerDetails.fullName,
        streetName: selectedPickupPoint.visitingAddress.streetName,
        streetNumber: selectedPickupPoint.visitingAddress.streetNumber,
        postalCode: selectedPickupPoint.visitingAddress.postalCode,
        city: selectedPickupPoint.visitingAddress.city,
        country: customerDetails.country,
      };

      // Step 1: Create Order
      const orderResponse = await fetch('/api/createOrder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basketItems, customerDetails, deliveryAddress }),
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

  const renderCustomerDetails = () => (
    <div>
      <h2 className="text-2xl font-bold mb-4">Kundeoplysninger</h2>

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
        onClick={handleShowPickupPoints}
        className="mt-6 bg-blue-500 text-white px-6 py-2 rounded-full shadow hover:bg-blue-600 transition"
      >
        Næste: Fragt og levering
      </button>
    </div>
  );

  const renderShippingAndPayment = () => (
    <div>
      <h2 className="text-2xl font-bold mb-4">Fragt og levering</h2>
      {showPickupPoints && (
        <div className="mt-8">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center">
                <LoadingSpinner />
                <p className="mt-4 font-bold">Henter afhentningssteder</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row justify-between space-y-4 lg:space-y-0 lg:space-x-4">
              <div className="w-full lg:w-1/2 overflow-y-scroll" style={{ maxHeight: '545px' }}>
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
          )}
          {!loading && (
            <div className="text-right mt-4">
              <button
                onClick={handleProceedToConfirmation}
                className="bg-blue-500 text-white px-6 py-2 rounded-full shadow hover:bg-blue-600 transition"
              >
                Næste: Godkend din ordre
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderOrderConfirmation = () => {
    const totalPrice = basketItems.reduce((total, item) => total + item.price * item.quantity, 0);
    const shippingCost = 3900; // Shipping cost in cents (e.g., 39 DKK)
    const totalPriceWithShipping = totalPrice + shippingCost;
    const vatAmount = totalPriceWithShipping * 0.25; // 25% VAT

    // Prepare invoice address
    const invoiceAddress = `${customerDetails.fullName}
${customerDetails.address}
${customerDetails.postalCode} ${customerDetails.city}
${customerDetails.country}
${customerDetails.email}`;

    // Prepare delivery address
    const selectedPickupPoint = pickupPoints.find((point) => point.servicePointId === selectedPoint);
    const deliveryAddress = selectedPickupPoint
      ? `${selectedPickupPoint.name}
${customerDetails.fullName}
${selectedPickupPoint.visitingAddress.streetName} ${selectedPickupPoint.visitingAddress.streetNumber}
${selectedPickupPoint.visitingAddress.postalCode} ${selectedPickupPoint.visitingAddress.city.toUpperCase()}
${customerDetails.country}`
      : '';

    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">Godkend din ordre</h2>

        <div className="mb-4">
          <h3 className="font-bold">Fakturaadresse</h3>
          <pre>{invoiceAddress}</pre>
        </div>

        <div className="mb-4">
          <h3 className="font-bold">Leveringsadresse</h3>
          <pre>{deliveryAddress}</pre>
        </div>

        <div className="mb-4">
          <h3 className="font-bold">Betalingsmetode</h3>
          <p>Kreditkort, Viabill, Apple Pay, Google Pay, Klarna eller MobilePay</p>
        </div>

        <div className="mb-4">
          <h3 className="font-bold">Leveringsmetode</h3>
          <p>Privatpakke Collect uden omdeling - Vælg selv udleveringssted</p>
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
            <strong>Total inkl. moms: {(totalPriceWithShipping / 100).toFixed(2)} kr.</strong>
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
      <BannerSteps currentStep={currentStep} setCurrentStep={setCurrentStep} />

      {basketItems.length === 0 ? (
        <p>Din kurv er tom. Du lander på siden om 5 sekunder</p>
      ) : (
        <>
          {/* Step 1: Basket Items */}
          {currentStep === 1 && (
            <>
              <h1 className="text-3xl font-bold mb-8">Min Kurv</h1>
              {basketItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between mb-4 p-4 border rounded"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-24 h-24 object-cover rounded"
                  />
                  <div className="flex-1 ml-4">
                    <h2 className="text-xl font-bold">{item.title}</h2>
                    <div className="flex items-center mt-2">
                      <button
                        onClick={() => updateItemQuantity(index, item.quantity - 1)}
                        className="px-2 py-1 bg-gray-200 rounded-l"
                      >
                        -
                      </button>
                      <span className="px-4 py-2 bg-gray-100">{item.quantity}</span>
                      <button
                        onClick={() => updateItemQuantity(index, item.quantity + 1)}
                        className="px-2 py-1 bg-gray-200 rounded-r"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-gray-700 mt-2">
                      Pris pr. pakke: {(item.price / 100).toFixed(2)} kr
                    </p>
                    <p className="text-gray-700 mt-2">
                      Totalpris: {((item.price * item.quantity) / 100).toFixed(2)} kr
                    </p>
                  </div>
                  <button onClick={() => removeItemFromBasket(index)} className="text-red-600">
                    Fjern
                  </button>
                </div>
              ))}
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
          {currentStep === 2 && <>{renderCustomerDetails()}</>}

          {/* Step 3: Shipping and Payment */}
          {currentStep === 3 && <>{renderShippingAndPayment()}</>}

          {/* Step 4: Order Confirmation */}
          {currentStep === 4 && <>{renderOrderConfirmation()}</>}
        </>
      )}
    </div>
  );
}
