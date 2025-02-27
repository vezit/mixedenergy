import React, { useState, useEffect, useRef } from 'react';
import MapComponent, { PickupPoint } from './MapComponent';
import LoadingSpinner from './LoadingSpinner';
import { ICustomerDetails } from '../types/ICustomerDetails';

interface ShippingAndPaymentProps {
  deliveryOption: string;
  setDeliveryOption: (option: string) => void;
  customerDetails: ICustomerDetails;
  /**
   * Must call "updateSession('updateDeliveryDetails', ... )" behind the scenes,
   * so the server can store the chosen pickup point or home-delivery address.
   */
  updateDeliveryDetailsInBackend: (
    deliveryType: string,
    data: { [key: string]: any }
  ) => Promise<void>;
  selectedPoint: PickupPoint | null;
  setSelectedPoint: (point: PickupPoint | null) => void;
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
   * Splits an address string into (streetName, streetNumber) if possible.
   * e.g. "Vinkelvej 12B" => { streetName: "Vinkelvej", streetNumber: "12B" }
   */
  const splitAddress = (address: string) => {
    const regex = /^(.*?)(\s+\d+\S*)$/;
    const match = address.match(regex);
    if (match) {
      return {
        streetName: match[1].trim(),
        streetNumber: match[2].trim(),
      };
    }
    return { streetName: address, streetNumber: '' };
  };

  /**
   * Fetch pickup points from /api/postnord/servicepoints
   */
  const fetchPickupPoints = async (details: ICustomerDetails) => {
    const { address = '', city, postalCode } = details;
    if (!city || !postalCode) {
      setLoading(false);
      return;
    }

    const { streetName, streetNumber } = splitAddress(address);
    let url = `/api/postnord/servicepoints?city=${encodeURIComponent(
      city
    )}&postalCode=${encodeURIComponent(postalCode)}`;

    if (streetName) {
      url += `&streetName=${encodeURIComponent(streetName)}`;
    }
    if (streetNumber) {
      url += `&streetNumber=${encodeURIComponent(streetNumber)}`;
    }

    try {
      const response = await fetch(url);
      const data = await response.json();
      const points: PickupPoint[] =
        data.servicePointInformationResponse?.servicePoints || [];
      setPickupPoints(points);
    } catch (error) {
      console.error('Error fetching PostNord service points:', error);
    } finally {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setLoading(false);
    }
  };

  /**
   * Called when user changes radio to "pickupPoint" or "homeDelivery."
   */
  const handleDeliveryOptionChange = async (option: string) => {
    setDeliveryOption(option);

    if (option === 'pickupPoint') {
      setLoading(true);

      // Show the spinner for up to 5 seconds while we fetch points
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = setTimeout(() => {
        // Stop spinner if it takes too long
        setLoading(false);
      }, 5000);

      // Attempt to fetch pickup points
      await fetchPickupPoints(customerDetails);
    } else {
      // user chose homeDelivery
      setPickupPoints([]);
      setSelectedPoint(null);
      setLoading(false);

      // Update session so it knows the user switched to homeDelivery
      await updateDeliveryDetailsInBackend('homeDelivery', {
        provider: 'postnord',
      });
    }
  };

  /**
   * Called when the user chooses a specific pickup point
   */
  const handleSelectedPointChange = async (newSelectedPointId: string | null) => {
    if (!newSelectedPointId) {
      setSelectedPoint(null);
      return;
    }

    const found = pickupPoints.find((p) => p.servicePointId === newSelectedPointId);
    if (found) {
      setSelectedPoint(found);
      // Update the session with the selected point
      await updateDeliveryDetailsInBackend('pickupPoint', {
        provider: 'postnord',
        selectedPickupPoint: found,
      });
    }
  };

  useEffect(() => {
    if (deliveryOption === 'pickupPoint' && customerDetails.postalCode) {
      fetchPickupPoints(customerDetails);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerDetails.postalCode, deliveryOption]);

  /** Helper if you want to translate opening hours day names to DK. */
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

  const selectedPickup = selectedPoint
    ? pickupPoints.find((p) => p.servicePointId === selectedPoint.servicePointId)
    : null;

  return (
    <div id="shipping-and-payment" className="mt-8">
      <h2 className="text-xl font-bold mb-4">Leveringsmuligheder</h2>

      {/* --- Pickup Point Option --- */}
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
          </div>
        </label>

        {/* If user selected "pickupPoint", show spinner + available points */}
        {deliveryOption === 'pickupPoint' && (
          <>
            {loading ? (
              <div className="mt-4">
                <LoadingSpinner />
              </div>
            ) : (
              pickupPoints.length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <div className="mb-4">
                    <select
                      value={selectedPickup?.servicePointId || ''}
                      onChange={(e) => handleSelectedPointChange(e.target.value)}
                      className="border border-gray-300 rounded p-2 w-full mb-4 text-sm"
                    >
                      <option value="">Vælg pakkeshop...</option>
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
                              <li
                                key={day.openDay}
                                className="flex justify-between w-64"
                              >
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
                        {/* <MapComponent
                          pickupPoints={pickupPoints}
                          selectedPoint={
                            selectedPickup ? selectedPickup.servicePointId : null
                          }
                          setSelectedPoint={(spid) => handleSelectedPointChange(spid)}
                        /> */}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* --- Home Delivery Option --- */}
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
            <span className="text-sm font-semibold">
              Privatpakke Home med omdeling
            </span>
            <img
              src="/images/postnord-logo.png"
              alt="postnord"
              className="inline-block ml-2 h-4"
              style={{ verticalAlign: 'middle' }}
            />
          </div>
        </label>
      </div>
    </div>
  );
};

export default ShippingAndPayment;
