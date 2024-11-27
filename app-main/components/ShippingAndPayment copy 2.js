// components/ShippingAndPayment.js

import React from 'react';
import PickupPointsList from './PickupPointsList';
import MapComponent from './MapComponent';
import LoadingSpinner from './LoadingSpinner';

const ShippingAndPayment = ({
  deliveryOption,
  handleDeliveryOptionChange,
  pickupPoints,
  selectedPoint,
  handleSelectedPointChange,
  loading,
}) => {
  return (
    <div id="shipping-and-payment">
      <h2 className="text-2xl font-bold mb-4">Leveringsmuligheder</h2>
      {/* Delivery Options */}
      <div className="mt-4">
        <label className="mr-4">
          <input
            type="radio"
            name="deliveryOption"
            value="pickupPoint"
            checked={deliveryOption === 'pickupPoint'}
            onChange={() => handleDeliveryOptionChange('pickupPoint')}
          />
          Afhentningssted
        </label>
        <label>
          <input
            type="radio"
            name="deliveryOption"
            value="homeDelivery"
            checked={deliveryOption === 'homeDelivery'}
            onChange={() => handleDeliveryOptionChange('homeDelivery')}
          />
          Hjemmelevering
        </label>
      </div>

      {deliveryOption === 'pickupPoint' && (
        <>
          {loading ? (
            // Show the LoadingSpinner while loading is true
            <div className="mt-4">
              <LoadingSpinner />
            </div>
          ) : (
            // Render the pickup points list and map after loading is false
            <>
              <h3 className="text-xl font-bold mt-4">Vælg Afhentningssted</h3>
              <div className="mb-4">
                <PickupPointsList
                  pickupPoints={pickupPoints}
                  selectedPoint={selectedPoint}
                  setSelectedPoint={handleSelectedPointChange}
                />
              </div>

              <MapComponent
                pickupPoints={pickupPoints}
                selectedPoint={selectedPoint}
                setSelectedPoint={handleSelectedPointChange}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ShippingAndPayment;
