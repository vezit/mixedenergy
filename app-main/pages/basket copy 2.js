import { useState, useEffect } from 'react';
import { useBasket } from '../lib/BasketContext';
import PickupPointsList from '../components/PickupPointsList';
import MapComponent from '../components/MapComponent';
import LoadingSpinner from '../components/LoadingSpinner';
import { getCookie } from '../lib/cookies'; // Importing from cookies.js

export default function Basket() {
  const { basketItems, setBasketItems, removeItemFromBasket } = useBasket();
  const [customerDetails, setCustomerDetails] = useState({
    customerType: 'Privat',
    fullName: '',
    mobileNumber: '',
    email: '',
    address: '',
    postalCode: '',
    city: '',
    country: 'Danmark',
    streetNumber: '',
  });
  const [errors, setErrors] = useState({});
  const [pickupPoints, setPickupPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPickupPoints, setShowPickupPoints] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);

  useEffect(() => {
    // Load customer details and other session info from Firestore if cookies are allowed
    const consentId = getCookie('cookie_consent_id');
    if (consentId) {
      // Firestore session fetching is handled in BasketContext for basketItems, so only customer details loading here
      const fetchCustomerDetails = async () => {
        const docRef = doc(db, 'sessions', consentId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.allowCookies && data.customerDetails) {
            setCustomerDetails(data.customerDetails); // Load customer details
          }
        }
      };
      fetchCustomerDetails();
    }
  }, []);

  // Update customer details in Firestore whenever they change
  useEffect(() => {
    const consentId = getCookie('cookie_consent_id');
    if (consentId) {
      const updateCustomerDetailsInFirestore = async () => {
        const docRef = doc(db, 'sessions', consentId);
        await setDoc(docRef, { customerDetails, updatedAt: new Date() }, { merge: true });
      };
      updateCustomerDetailsInFirestore();
    }
  }, [customerDetails]);

  const updateQuantity = (index, newQuantity) => {
    if (newQuantity <= 0) {
      removeItemFromBasket(index);
    } else {
      const updatedBasket = basketItems.map((item, i) =>
        i === index ? { ...item, quantity: newQuantity } : item
      );
      setBasketItems(updatedBasket);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCustomerDetails((prevState) => ({
      ...prevState,
      [name]: value,
    }));

    if (name === 'postalCode') {
      if (value.length === 4 && /^\d{4}$/.test(value)) {
        fetch(`https://api.dataforsyningen.dk/postnumre/${value}`)
          .then((res) => {
            if (!res.ok) {
              throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
          })
          .then((data) => {
            const cityName = data.navn;
            setCustomerDetails((prevState) => ({
              ...prevState,
              city: cityName || '',
            }));
          })
          .catch((error) => {
            console.error('Error fetching city name:', error);
            setCustomerDetails((prevState) => ({
              ...prevState,
              city: '',
            }));
          });
      } else {
        setCustomerDetails((prevState) => ({
          ...prevState,
          city: '',
        }));
      }
    }
  };

  const fetchPickupPoints = (updatedDetails) => {
    if (
      updatedDetails.city &&
      updatedDetails.postalCode &&
      updatedDetails.streetNumber
    ) {
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

      setCustomerDetails(updatedDetails);

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
      {/* Customer Details Form */}
    </div>
  );

  const renderShippingAndPayment = () => (
    <div>
      {/* Shipping and Payment Section */}
    </div>
  );

  const renderOrderConfirmation = () => (
    <div>
      <h2 className="text-2xl font-bold mb-4">Godkend din ordre</h2>
      <div className="text-right text-xl font-bold">
        Total:{' '}
        {basketItems
          .reduce(
            (total, item) => total + item.price * item.quantity,
            0
          )
          .toFixed(2)}
        kr
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
                  <button onClick={() => updateQuantity(index, item.quantity - 1)} className="px-2 py-1 bg-gray-200 rounded-l">
                    -
                  </button>
                  <span className="px-4 py-2 bg-gray-100">{item.quantity}</span>
                  <button onClick={() => updateQuantity(index, item.quantity + 1)} className="px-2 py-1 bg-gray-200 rounded-r">
                    +
                  </button>
                </div>
                <p className="text-gray-700 mt-2">Pris pr ramme: {item.price}kr</p>
                <p className="text-gray-700 mt-2">Totalpris: {(item.price * item.quantity).toFixed(2)}kr</p>
              </div>
              <button onClick={() => removeItemFromBasket(index)} className="text-red-600">
                Fjern
              </button>
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
