// pages/basket.js
import { useState } from 'react';
import { useBasket } from '../lib/BasketContext';
import PickupPointsList from '../components/PickupPointsList';
import MapComponent from '../components/MapComponent';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Basket() {
  const { basketItems, removeItemFromBasket, customerDetails, updateCustomerDetails, updateItemQuantity } = useBasket();
  const [errors, setErrors] = useState({});
  const [pickupPoints, setPickupPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPickupPoints, setShowPickupPoints] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);

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
      fetch(`/api/postnord/servicepoints?city=${updatedDetails.city}&postalCode=${updatedDetails.postalCode}&streetName=${updatedDetails.address}&streetNumber=${updatedDetails.streetNumber}`)
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
        Fortsæt
      </button>
    </div>
  );

  const renderShippingAndPayment = () => (
    <div>
      <h2 className="text-2xl font-bold mb-4">Fragt og betaling</h2>
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
        </div>
      )}
    </div>
  );

  const renderOrderConfirmation = () => (
    <div>
      <h2 className="text-2xl font-bold mb-4">Godkend din ordre</h2>
      <div className="text-right text-xl font-bold">
        Total: {(basketItems.reduce((total, item) => total + (item.price * item.quantity), 0) / 100).toFixed(2)} kr
      </div>
      <button
        onClick={() => alert('Checkout process')}
        className="mt-6 bg-red-500 text-white px-6 py-2 rounded-full shadow hover:bg-red-600 transition"
      >
        BETAL
      </button>
    </div>
  );

  return (
    <div className="p-8 w-full max-w-screen-lg mx-auto">
      <h1 className="text-3xl font-bold mb-8">Min Kurv</h1>

      {basketItems.length === 0 ? (
        <p>Din kurv er tom</p>
      ) : (
        <>
          {basketItems.map((item, index) => (
            <div key={index} className="flex items-center justify-between mb-4 p-4 border rounded">
              <img src={item.image} alt={item.title} className="w-24 h-24 object-cover rounded" />
              <div className="flex-1 ml-4">
                <h2 className="text-xl font-bold">{item.title}</h2>
                <div className="flex items-center mt-2">
                  <button onClick={() => updateItemQuantity(index, item.quantity - 1)} className="px-2 py-1 bg-gray-200 rounded-l">
                    -
                  </button>
                  <span className="px-4 py-2 bg-gray-100">{item.quantity}</span>
                  <button onClick={() => updateItemQuantity(index, item.quantity + 1)} className="px-2 py-1 bg-gray-200 rounded-r">
                    +
                  </button>
                </div>
                <p className="text-gray-700 mt-2">Pris pr. pakke: {(item.price / 100).toFixed(2)} kr</p>
                <p className="text-gray-700 mt-2">Totalpris: {((item.price * item.quantity) / 100).toFixed(2)} kr</p>
              </div>
              <button onClick={() => removeItemFromBasket(index)} className="text-red-600">Fjern</button>
            </div>
          ))}

          {renderCustomerDetails()}
          {renderShippingAndPayment()}
          {renderOrderConfirmation()}
        </>
      )}
    </div>
  );
}
