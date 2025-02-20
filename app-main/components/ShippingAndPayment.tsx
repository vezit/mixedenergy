import React, { useState, useEffect, useRef } from 'react';
import MapComponent, { PickupPoint } from './MapComponent';
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

  /**
   * Called when user changes the radio button.
   * We no longer immediately call updateDeliveryDetailsInBackend.
   */
  const handleDeliveryOptionChange = (option: string) => {
    setDeliveryOption(option);

    if (option === 'pickupPoint') {
      setLoading(true);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      // Give ourselves up to 5s to fetch the points or hide spinner
      loadingTimeoutRef.current = setTimeout(() => {
        if (pickupPoints.length > 0) {
          setLoading(false);
        }
      }, 5000);

      // Attempt to fetch pickup points for the user’s address
      fetchPickupPoints(customerDetails);
    } else {
      // user chose homeDelivery
      setLoading(false);
      setPickupPoints([]);
      setSelectedPoint(null);
      // In previous code, we called `updateDeliveryDetailsInBackend(option, {})` here.
      // Now, we skip it, so no immediate session update on page load or radio switch.
    }
  };

  /**
   * Splits address into "streetName" + "streetNumber" if possible.
   */
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

  /**
   * fetchPickupPoints => tries to load from /api/postnord/servicepoints
   * We do NOT call updateSession automatically here.
   */
  const fetchPickupPoints = (updatedDetails: ICustomerDetails) => {
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
          const points: PickupPoint[] =
            data.servicePointInformationResponse?.servicePoints || [];

          setPickupPoints(points);

          // In previous code, we automatically updated the session with the first point:
          //   updateDeliveryDetailsInBackend('pickupPoint', { selectedPickupPoint: points[0] })
          // We have removed that line to prevent automatic session updates on page load.

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
      // If we don’t have city/postalCode, we can’t fetch pickup points
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setLoading(false);
    }
  };

  /**
   * Called when user selects a specific pickup point in the <select> or the map.
   * Now we DO call updateDeliveryDetailsInBackend here so we only update session if user explicitly picks a point.
   */
  const handleSelectedPointChange = (newSelectedPoint: string | null) => {
    setSelectedPoint(newSelectedPoint);

    if (deliveryOption === 'pickupPoint' && newSelectedPoint) {
      const selectedPickupPoint = pickupPoints.find(
        (point) => point.servicePointId === newSelectedPoint
      );
      if (selectedPickupPoint) {
        // Now we do the session update, because user explicitly chose a point
        updateDeliveryDetailsInBackend('pickupPoint', { selectedPickupPoint });
      }
    }
  };

  /**
   * If user has 'pickupPoint' selected and they edit their postalCode,
   * we re-fetch the points. But we do NOT update session automatically.
   */
  useEffect(() => {
    if (deliveryOption === 'pickupPoint' && customerDetails.postalCode) {
      fetchPickupPoints(customerDetails);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerDetails.postalCode, deliveryOption]);

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

      {/* Pickup Point Option */}
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
              src="/images/postnord-logo.png"
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
                {pickupPoints.length > 0 && (
                  <div className="mt-4 border-t pt-4">
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

                    {selectedPickup && (
                      <div className="flex flex-col md:flex-row md:space-x-4">
                        <div className="md:w-1/2 mb-4 md:mb-0">
                          <h3 className="text-sm font-bold">
                            {selectedPickup.name} -{' '}
                            {selectedPickup.visitingAddress.streetName}{' '}
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

      {/* Home Delivery Option */}
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
              src="/images/postnord-logo.png"
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
