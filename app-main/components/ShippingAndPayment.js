// components/ShippingAndPayment.js

import React, { useState, useEffect, useRef } from 'react';
import PickupPointsList from './PickupPointsList';
import MapComponent from './MapComponent';
import LoadingSpinner from './LoadingSpinner';

const ShippingAndPayment = ({
  deliveryOption,
  setDeliveryOption,
  customerDetails,
  updateDeliveryDetailsInBackend,
  selectedPoint,
  setSelectedPoint,
}) => {
  const [pickupPoints, setPickupPoints] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadingTimeoutRef = useRef(null);

  // Function to handle delivery option change
  const handleDeliveryOptionChange = (option) => {
    setDeliveryOption(option);

    if (option === 'pickupPoint') {
      setLoading(true);
      // Start the minimum loading time
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      loadingTimeoutRef.current = setTimeout(() => {
        // After 5 seconds, if data has loaded, set loading to false
        if (pickupPoints.length > 0) {
          setLoading(false);
        }
      }, 5000);
      fetchPickupPoints(customerDetails);
    } else {
      setLoading(false);
      setPickupPoints([]);
      setSelectedPoint(null);
      updateDeliveryDetailsInBackend(option, {});
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
            updateDeliveryDetailsInBackend('pickupPoint', {
              selectedPickupPoint: points[0],
            });
          }
          // If minimum loading time has passed, stop loading
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching PostNord service points:', error);
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
          }
          setLoading(false);
        });
    } else {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setLoading(false);
    }
  };

  // Function to handle selected pickup point change
  const handleSelectedPointChange = (newSelectedPoint) => {
    setSelectedPoint(newSelectedPoint);
    if (deliveryOption === 'pickupPoint') {
      const selectedPickupPoint = pickupPoints.find(
        (point) => point.servicePointId === newSelectedPoint
      );
      updateDeliveryDetailsInBackend('pickupPoint', { selectedPickupPoint });
    }
  };

  // Fetch pickup points when customer details change
  useEffect(() => {
    if (deliveryOption === 'pickupPoint' && customerDetails.postalCode) {
      fetchPickupPoints(customerDetails);
    }
  }, [customerDetails.postalCode, deliveryOption]);

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
