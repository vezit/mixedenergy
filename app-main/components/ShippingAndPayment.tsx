import React, { useState, useEffect, useRef } from 'react';
import MapComponent, { PickupPoint } from './MapComponent';
import LoadingSpinner from './LoadingSpinner';

// 1) Import the session context so we can call fetchSession
import { useSessionContext } from '../contexts/SessionContext';

interface ICustomerDetails {
  address?: string;
  city?: string;
  postalCode?: string;
  fullName?: string;
  mobileNumber?: string;
  email?: string;
  // Add other fields as needed
}

interface ShippingAndPaymentProps {
  deliveryOption: string;
  setDeliveryOption: (option: string) => void;
  customerDetails: ICustomerDetails;
  /**  
   * Must call "updateSession('updateDeliveryDetails', { provider, providerDetails, ... })"
   * so that the server sets basketDetails.deliveryDetails accordingly.
   */
  updateDeliveryDetailsInBackend: (
    deliveryType: string,
    data: { [key: string]: any }
  ) => Promise<void>;
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

  // 2) Get fetchSession directly from the SessionContext
  const { fetchSession } = useSessionContext();

  /**
   * Splits an address string into streetName + streetNumber.
   * e.g. "Vinkelvej 12D, 3tv" => { streetName: "Vinkelvej 12D,", streetNumber: "3tv" }
   * Adjust as needed for your address format.
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
    return {
      streetName: address,
      streetNumber: '',
    };
  };

  /**
   * fetchPickupPoints => calls your /api/postnord/servicepoints endpoint
   */
  const fetchPickupPoints = (details: ICustomerDetails) => {
    const { address = '', city, postalCode } = details;
    const { streetName, streetNumber } = splitAddress(address);

    if (!city || !postalCode) {
      cleanupLoadingTimeout();
      setLoading(false);
      return;
    }

    let url = `/api/postnord/servicepoints?city=${encodeURIComponent(
      city
    )}&postalCode=${encodeURIComponent(postalCode)}`;

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
        cleanupLoadingTimeout();
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching PostNord service points:', error);
        cleanupLoadingTimeout();
        setLoading(false);
      });
  };

  const cleanupLoadingTimeout = () => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };

  /**
   * handleDeliveryOptionChange => user picks "pickupPoint" or "homeDelivery".
   */
  const handleDeliveryOptionChange = async (option: string) => {
    setDeliveryOption(option);

    if (option === 'pickupPoint') {
      setLoading(true);
      cleanupLoadingTimeout();
      loadingTimeoutRef.current = setTimeout(() => {
        if (pickupPoints.length > 0) {
          setLoading(false);
        }
      }, 5000);

      // 1) Fetch possible pickup points
      fetchPickupPoints(customerDetails);

      // 2) Immediately update session => "pickupPoint"
      //    But we won't specify the actual pickup point address yet
      //    because user hasn't chosen one. Just pass empty providerDetails
      await updateDeliveryDetailsInBackend('pickupPoint', {
        provider: 'postnord',
        // You might pass an empty deliveryAddress or skip it
        deliveryAddress: {},
        providerDetails: {},
      });

      // 3) Re-fetch session so local state sees updated basket_details
      await fetchSession();
    } else {
      // user chose homeDelivery
      setLoading(false);
      setPickupPoints([]);
      setSelectedPoint(null);

      // build home address from user's details
      const homeAddress = {
        address: customerDetails.address || '',
        city: customerDetails.city || '',
        postalCode: customerDetails.postalCode || '',
      };

      // 1) update session => "homeDelivery"
      await updateDeliveryDetailsInBackend('homeDelivery', {
        provider: 'postnord',
        deliveryAddress: homeAddress,
        providerDetails: {},
      });

      // 2) re-fetch session
      await fetchSession();
    }
  };

  /**
   * handleSelectedPointChange => user selects a specific "pickupPoint" from the dropdown or the map.
   */
  const handleSelectedPointChange = async (newSelectedPoint: string | null) => {
    setSelectedPoint(newSelectedPoint);

    if (deliveryOption === 'pickupPoint' && newSelectedPoint) {
      // 1) find that pickupPoint in local array
      const selectedPickupPoint = pickupPoints.find(
        (p) => p.servicePointId === newSelectedPoint
      );
      if (selectedPickupPoint) {
        // 2) build a minimal address
        const newDeliveryAddress = {
          address:
            selectedPickupPoint.visitingAddress.streetName +
            ' ' +
            selectedPickupPoint.visitingAddress.streetNumber,
          city: selectedPickupPoint.visitingAddress.city,
          postalCode: selectedPickupPoint.visitingAddress.postalCode,
        };

        // 3) call updateDeliveryDetailsInBackend => pass the entire pickupPoint under providerDetails
        await updateDeliveryDetailsInBackend('pickupPoint', {
          provider: 'postnord',
          deliveryAddress: newDeliveryAddress,
          providerDetails: {
            postnord: {
              servicePointId: selectedPickupPoint, // must be the entire object
            },
          },
        });

        // 4) re-fetch session
        await fetchSession();
      }
    }
  };

  /**
   * If user is on "pickupPoint" and changes postal code => re-fetch
   */
  useEffect(() => {
    if (deliveryOption === 'pickupPoint' && customerDetails.postalCode) {
      fetchPickupPoints(customerDetails);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerDetails.postalCode, deliveryOption]);

  /** Helper for translating days to Danish, if needed. */
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
              pickupPoints.length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <div className="mb-4">
                    <select
                      value={selectedPoint || ''}
                      onChange={(e) => handleSelectedPointChange(e.target.value)}
                      className="border border-gray-300 rounded p-2 w-full mb-4 text-sm"
                    >
                      <option value="">Vælg pakkeshop...</option>
                      {pickupPoints.map((point) => {
                        const displayText = `${point.name} - ${point.visitingAddress.streetName} ${point.visitingAddress.streetNumber}`;
                        return (
                          <option
                            key={point.servicePointId}
                            value={point.servicePointId}
                          >
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
              )
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
            <span className="text-sm font-semibold">
              Privatpakke Home med omdeling
            </span>
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
