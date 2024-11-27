// components/OrderConfirmation.js

import React from 'react';
import LoadingButton from './LoadingButton';

const OrderConfirmation = ({
  basketSummary,
  termsAccepted,
  setTermsAccepted,
  termsError,
  handlePayment,
  isProcessingPayment,
  setTermsError,
}) => {
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
            <p>{basketSummary.deliveryDetails.deliveryAddress.name}</p>
            <p>
              {basketSummary.deliveryDetails.deliveryAddress.streetName}{' '}
              {basketSummary.deliveryDetails.deliveryAddress.streetNumber}
            </p>
            <p>
              {basketSummary.deliveryDetails.deliveryAddress.postalCode}{' '}
              {basketSummary.deliveryDetails.deliveryAddress.city}
            </p>
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

      <div className="mt-4 flex justify-end">
        <LoadingButton
          onClick={handlePayment}
          loading={isProcessingPayment}
          className="bg-green-500 text-white px-6 py-2 rounded-full shadow hover:bg-green-600 transition"
        >
          Gå til betaling
        </LoadingButton>
      </div>
    </div>
  );
};

export default OrderConfirmation;
