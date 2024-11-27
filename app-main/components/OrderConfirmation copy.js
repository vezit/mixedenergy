// components/OrderConfirmation.js

import React, { useState } from 'react';
import LoadingButton from './LoadingButton';
import { getCookie } from '../lib/cookies';

const OrderConfirmation = ({
  basketSummary,
  customerDetails,
  deliveryOption,
  selectedPoint,
  updateDeliveryDetailsInBackend,
}) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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
        const selectedPickupPoint = basketSummary.deliveryDetails.providerDetails.postnord;
        if (selectedPickupPoint) {
          deliveryAddress = basketSummary.deliveryDetails.deliveryAddress;
        } else {
          alert('Vælg venligst et afhentningssted.');
          // Scroll to shipping section
          document.getElementById('shipping-and-payment').scrollIntoView({ behavior: 'smooth' });
          return;
        }
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

  return (
    <div id="order-confirmation">
      <h2 className="text-2xl font-bold mb-4">Bekræft Ordre</h2>
      {/* Order Summary */}
      {basketSummary ? (
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">Ordreoversigt</h3>
          {/* Display the summary */}
          <div className="mb-4">
            <h4 className="font-bold">Leveringstype:</h4>
            <p>
              {basketSummary.deliveryDetails.deliveryType === 'pickupPoint'
                ? 'Afhentningssted'
                : 'Hjemmelevering'}
            </p>
          </div>
          <div className="mb-4">
            <h4 className="font-bold">Leveringsadresse:</h4>
            <p>{basketSummary?.deliveryDetails?.deliveryAddress?.name || ''}</p>
            <p>
              {basketSummary?.deliveryDetails?.deliveryAddress?.streetName || ''}{' '}
              {basketSummary?.deliveryDetails?.deliveryAddress?.streetNumber || ''}
            </p>
            <p>
              {basketSummary?.deliveryDetails?.deliveryAddress?.postalCode || ''}{' '}
              {basketSummary?.deliveryDetails?.deliveryAddress?.city || ''}
            </p>
            <p>{basketSummary?.deliveryDetails?.deliveryAddress?.country || ''}</p>
          </div>
          <div className="mb-4">
            <h4 className="font-bold">Kundeoplysninger:</h4>
            <p>Navn: {basketSummary.customerDetails.fullName}</p>
            <p>Email: {basketSummary.customerDetails.email}</p>
            <p>Telefon: {basketSummary.customerDetails.mobileNumber}</p>
          </div>
          <div className="mb-4">
            <h4 className="font-bold">Ordre Detaljer:</h4>
            <p>
              Antal pakker:{' '}
              {basketSummary.items.reduce((acc, item) => acc + item.quantity, 0)}
            </p>
            <p>
              Total pris:{' '}
              {(
                basketSummary.items.reduce((acc, item) => acc + item.totalPrice, 0) / 100
              ).toFixed(2)}{' '}
              kr
            </p>
            <p>
              Total pant:{' '}
              {(
                basketSummary.items.reduce((acc, item) => acc + item.totalRecyclingFee, 0) / 100
              ).toFixed(2)}{' '}
              kr
            </p>
            <p>
              Leveringsgebyr:{' '}
              {basketSummary.deliveryDetails.deliveryFee
                ? (basketSummary.deliveryDetails.deliveryFee / 100).toFixed(2) + ' kr'
                : 'Gratis'}
            </p>
          </div>
        </div>
      ) : (
        <p>Indlæser ordreoversigt...</p>
      )}

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

      <div className="mt-8 flex justify-center">
        <LoadingButton
          onClick={handlePayment}
          loading={isProcessingPayment}
          className="bg-blue-500 text-white px-6 py-2 rounded-full shadow hover:bg-green-600 transition"
        >
          Gå til betaling
        </LoadingButton>
      </div>
    </div>
  );
};

export default OrderConfirmation;
