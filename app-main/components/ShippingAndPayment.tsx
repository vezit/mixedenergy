import React, { useState, useEffect, useRef } from 'react';
import MapComponent, { PickupPoint } from './MapComponent'; // <-- Import PickupPoint
import LoadingSpinner from './LoadingSpinner';

interface IOpeningHour {
  openDay: string;
  openTime: string;
  closeTime: string;
}

interface ICustomerDetails {
  address?: string;
  city?: string;
  postalCode?: string;
  // Add other fields as needed
}

interface ShippingAndPaymentProps {
  deliveryOption: string;
  setDeliveryOption: (option: string) => void;
  customerDetails: ICustomerDetails;
  updateDeliveryDetailsInBackend: (option: string, data: { [key: string]: any }) => void;
  selectedPoint: string | null;
  setSelectedPoint: (point: string | null) => void;
}

const ShippingAndPayment: React.FC<ShippingAndPaymentProps> = ({
  deliveryOption,
  setDeliveryOption,
  customerDetails,
  updateDeliveryDetailsInBackend,
  selectedPoint,
  setSelectedPoint,
}) => {
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]); 
  const [loading, setLoading] = useState<boolean>(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle delivery option change
  const handleDeliveryOptionChange = (option: string) => {
    setDeliveryOption(option);
    if (option === 'pickupPoint') {
      setLoading(true);
      // Minimum loading time (in case data loads too quickly)
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      loadingTimeoutRef.current = setTimeout(() => {
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

  // Split address into streetName and streetNumber
  const splitAddress = (address: string) => {
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

  const fetchPickupPoints = (updatedDetails: ICustomerDetails) => {
    const { streetName, streetNumber } = splitAddress(updatedDetails.address || '');
    // Only fetch if city and postalCode are present
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
          // Adjust this based on your actual API response structure
          const points: PickupPoint[] =
            data.servicePointInformationResponse?.servicePoints || [];

          setPickupPoints(points);
          if (points.length > 0) {
            // Select the first pickup point by default
            setSelectedPoint(points[0].servicePointId);
            updateDeliveryDetailsInBackend('pickupPoint', {
              selectedPickupPoint: points[0],
            });
          }

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
      // If insufficient data, skip fetch
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setLoading(false);
    }
  };

  const handleSelectedPointChange = (newSelectedPoint: string | null) => {
    setSelectedPoint(newSelectedPoint);
    if (deliveryOption === 'pickupPoint' && newSelectedPoint) {
      const selectedPickupPoint = pickupPoints.find(
        (point) => point.servicePointId === newSelectedPoint
      );
      updateDeliveryDetailsInBackend('pickupPoint', { selectedPickupPoint });
    }
  };

  // Fetch pickup points whenever the user changes postalCode (or city) and the delivery option is 'pickupPoint'
  useEffect(() => {
    if (deliveryOption === 'pickupPoint' && customerDetails.postalCode) {
      fetchPickupPoints(customerDetails);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerDetails.postalCode, deliveryOption]);

  // Utility to translate English day to Danish (adjust if needed)
  const translateDay = (day: string): string => {
    const days: Record<string, string> = {
      Monday: 'Mandag',
      Tuesday: 'Tirsdag',
      Wednesday: 'Onsdag',
      Thursday: 'Torsdag',
      Friday: 'Fredag',
      Saturday: 'Lørdag',
      Sunday: 'Søndag',
    };
    return days[day] || day;
  };

  const selectedPickup = pickupPoints.find((p) => p.servicePointId === selectedPoint);

  return (
    <div id="shipping-and-payment" className="mt-8">
      <h2 className="text-xl font-bold mb-4">Leveringsmuligheder</h2>

      {/* Privatpakke Collect uden omdeling */}
      <div className="mb-4">
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="deliveryOption"
            value="pickupPoint"
            checked={deliveryOption === 'pickupPoint'}
            onChange={() => handleDeliveryOptionChange('pickupPoint')}
            className="mr-2"
          />
          <div className="flex items-center">
            <span className="text-sm font-semibold">
              Privatpakke Collect uden omdeling - Vælg selv udleveringssted
            </span>
            <img
              src="/postnord-logo.png"
              alt="postnord"
              className="inline-block ml-2 h-4"
              style={{ verticalAlign: 'middle' }}
            />
            <span className="text-sm font-normal ml-2">39 kr.</span>
          </div>
        </label>

        {deliveryOption === 'pickupPoint' && (
          <>
            {loading ? (
              <div className="mt-4">
                <LoadingSpinner />
              </div>
            ) : (
              <>
                {/* If pickupPoints are loaded, show a dropdown and map */}
                {pickupPoints.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    {/* Dropdown to select pickup point */}
                    <div className="mb-4">
                      <select
                        value={selectedPoint || ''}
                        onChange={(e) => handleSelectedPointChange(e.target.value)}
                        className="border border-gray-300 rounded p-2 w-full mb-4 text-sm"
                      >
                        {pickupPoints.map((point) => {
                          const displayText = `${point.name} - ${point.visitingAddress.streetName} ${point.visitingAddress.streetNumber}`;
                          return (
                            <option key={point.servicePointId} value={point.servicePointId}>
                              {displayText}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Show selected pickup details & map */}
                    {selectedPickup && (
                      <div className="flex flex-col md:flex-row md:space-x-4">
                        {/* Pickup point details */}
                        <div className="md:w-1/2 mb-4 md:mb-0">
                          <h3 className="text-sm font-bold">
                            {selectedPickup.name} - {selectedPickup.visitingAddress.streetName}{' '}
                            {selectedPickup.visitingAddress.streetNumber}
                          </h3>
                          <p className="text-sm mb-2">
                            {selectedPickup.visitingAddress.postalCode}{' '}
                            {selectedPickup.visitingAddress.city.toUpperCase()}
                          </p>
                          <hr className="my-2" />
                          <b className="text-xs text-gray-500 font-bold block mb-2">
                            Åbningstider
                          </b>
                          <ul className="list-none p-0 m-0 text-xs text-gray-600">
                            {selectedPickup.openingHours?.postalServices?.length ? (
                              selectedPickup.openingHours.postalServices.map((day) => (
                                <li key={day.openDay} className="flex justify-between w-64">
                                  <span>{translateDay(day.openDay)}</span>
                                  <span>
                                    {day.openTime} - {day.closeTime}
                                  </span>
                                </li>
                              ))
                            ) : (
                              <li>Ingen åbningstider tilgængelige</li>
                            )}
                          </ul>
                        </div>

                        {/* Map with markers */}
                        <div className="md:w-1/2">
                          <MapComponent
                            pickupPoints={pickupPoints}
                            selectedPoint={selectedPoint}
                            setSelectedPoint={(spid) => handleSelectedPointChange(spid)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Privatpakke Home med omdeling */}
      <div className="mb-4">
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="deliveryOption"
            value="homeDelivery"
            checked={deliveryOption === 'homeDelivery'}
            onChange={() => handleDeliveryOptionChange('homeDelivery')}
            className="mr-2"
          />
          <div className="flex items-center">
            <span className="text-sm font-semibold">Privatpakke Home med omdeling</span>
            <img
              src="/postnord-logo.png"
              alt="postnord"
              className="inline-block ml-2 h-4"
              style={{ verticalAlign: 'middle' }}
            />
            <span className="text-sm font-normal ml-2">49 kr.</span>
          </div>
        </label>
      </div>
    </div>
  );
};

export default ShippingAndPayment;
