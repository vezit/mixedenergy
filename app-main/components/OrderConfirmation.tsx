import React, { useState, useEffect, FC } from 'react';
import LoadingButton from './LoadingButton';
import { useRouter } from 'next/router';
import { useBasket } from './BasketContext';

// ======== INTERFACES ======== //

// Make a single, shared interface for your customer details:
export interface ICustomerDetails {
  fullName: string;
  mobileNumber: string;
  email: string;
  address?: string;
  postalCode?: string;
  city?: string;
  // Add more fields if needed
  [key: string]: any; // optional index signature if your code uses extra fields
}

export interface IDeliveryAddress {
  name?: string;
  streetName?: string;
  streetNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  [key: string]: any;
}

export interface IBasketItem {
  quantity: number;
  // Add more fields if needed, such as totalPrice or totalRecyclingFee, if used
}

export interface IBasketSummary {
  deliveryDetails?: {
    deliveryAddress?: IDeliveryAddress;
    deliveryFee?: number; // in "øre", e.g., 2999 for 29.99 kr
  };
}

// Error messages are strings
interface ErrorMap {
  [field: string]: string;
}

// "Touched fields" are boolean
interface TouchedFieldsMap {
  [field: string]: boolean;
}

/**
 * PROPS: Option A => `basketSummary?: IBasketSummary | null`
 * This allows the parent to pass either IBasketSummary, null, or omit it.
 */
interface OrderConfirmationProps {
  // Required props
  customerDetails: ICustomerDetails;
  deliveryOption: string; // e.g. "pickupPoint" | "homeDelivery"
  selectedPoint: any;     // or define a custom interface if you know the shape
  updateDeliveryDetailsInBackend: (
    deliveryOption: string,
    extras?: { selectedPickupPoint?: any }
  ) => Promise<void>;
  totalPrice: number;        // e.g. sum of prices in øre
  totalRecyclingFee: number; // e.g. sum of recycling fees in øre
  basketItems: IBasketItem[];

  // Optionally allow `null`
  basketSummary?: IBasketSummary | null;

  // Error + Touched
  errors: ErrorMap;
  setErrors: React.Dispatch<React.SetStateAction<ErrorMap>>;
  touchedFields: TouchedFieldsMap;
  setTouchedFields: React.Dispatch<React.SetStateAction<TouchedFieldsMap>>;

  // Submission flags
  submitAttempted: boolean;
  setSubmitAttempted: React.Dispatch<React.SetStateAction<boolean>>;
}

// ======== COMPONENT ======== //
const OrderConfirmation: FC<OrderConfirmationProps> = ({
  customerDetails,
  deliveryOption,
  selectedPoint,
  updateDeliveryDetailsInBackend,
  totalPrice,
  totalRecyclingFee,
  basketItems,
  basketSummary,
  errors,
  setErrors,
  touchedFields,
  setTouchedFields,
  submitAttempted,
  setSubmitAttempted,
}) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const router = useRouter();
  // Remove if not using anything from the basket
  const basketContext = useBasket();

  // Helper: split address into streetName and streetNumber
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

  const [deliveryAddress, setDeliveryAddress] = useState<IDeliveryAddress>({});

  // On mount or when certain dependencies change, build the delivery address from either basketSummary or local logic
  useEffect(() => {
    if (
      basketSummary &&
      basketSummary.deliveryDetails &&
      basketSummary.deliveryDetails.deliveryAddress
    ) {
      // Use the existing address from basketSummary
      setDeliveryAddress(basketSummary.deliveryDetails.deliveryAddress);
    } else {
      // Otherwise, construct based on selection
      if (deliveryOption === 'pickupPoint') {
        if (selectedPoint) {
          setDeliveryAddress({
            name: selectedPoint.name,
            streetName: selectedPoint.visitingAddress.streetName,
            streetNumber: selectedPoint.visitingAddress.streetNumber,
            postalCode: selectedPoint.visitingAddress.postalCode,
            city: selectedPoint.visitingAddress.city,
            country: 'Danmark',
          });
        } else {
          setDeliveryAddress({
            name: 'Valgt afhentningssted',
            streetName: '',
            streetNumber: '',
            postalCode: '',
            city: '',
            country: 'Danmark',
          });
        }
      } else if (deliveryOption === 'homeDelivery') {
        const { streetName, streetNumber } = splitAddress(customerDetails.address || '');
        setDeliveryAddress({
          name: customerDetails.fullName,
          streetName,
          streetNumber,
          postalCode: customerDetails.postalCode,
          city: customerDetails.city,
          country: 'Danmark',
        });
      }
    }
  }, [basketSummary, customerDetails, deliveryOption, selectedPoint]);

  // MAIN SUBMIT HANDLER
  const handlePayment = async () => {
    // Mark that user attempted to submit
    setSubmitAttempted(true);

    // Validate required customer details
    const requiredFields = ['fullName', 'mobileNumber', 'email', 'address', 'postalCode', 'city'];
    let customerDetailsValid = true;

    const newErrors: ErrorMap = { ...errors };
    const newTouchedFields: TouchedFieldsMap = { ...touchedFields };

    requiredFields.forEach((field) => {
      // @ts-ignore if your ICustomerDetails can have undefined fields
      if (!customerDetails[field] || !customerDetails[field].trim()) {
        customerDetailsValid = false;
        newErrors[field] = 'Dette felt er påkrævet';
        newTouchedFields[field] = true;
      }
    });

    setErrors(newErrors);
    setTouchedFields(newTouchedFields);

    if (!customerDetailsValid) {
      // Scroll to the first invalid field
      document.getElementById('customer-details')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Validate delivery details
    if (deliveryOption === 'pickupPoint' && !selectedPoint) {
      document.getElementById('shipping-and-payment')?.scrollIntoView({ behavior: 'smooth' });
      alert('Vælg venligst et afhentningssted.');
      return;
    }

    if (deliveryOption === 'homeDelivery') {
      const requiredDeliveryFields = ['name', 'streetName', 'postalCode', 'city', 'country'];
      const deliveryValid = requiredDeliveryFields.every((field) =>
        deliveryAddress[field]?.toString().trim()
      );
      if (!deliveryValid) {
        document.getElementById('customer-details')?.scrollIntoView({ behavior: 'smooth' });
        alert('Udfyld venligst alle leveringsdetaljer.');
        return;
      }
    }

    // Check if basket is empty
    if (!basketItems || basketItems.length === 0) {
      window.location.href = '/'; // redirect if no items
      return;
    }

    // Check terms acceptance
    if (!termsAccepted) {
      setTermsError(
        'Du skal acceptere vores handelsbetingelser før du kan fortsætte. Sæt venligst flueben i boksen herover.'
      );
      document.getElementById('order-confirmation')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Proceed with payment
    setIsProcessingPayment(true);
    try {
      // 1) Ensure delivery details are updated in backend
      await updateDeliveryDetailsInBackend(deliveryOption, { selectedPickupPoint: selectedPoint });

      // 2) Create Order and initiate payment
      const response = await fetch('/api/firebase/6-createOrder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const data = await response.json();

      if (data.paymentLink) {
        window.location.href = data.paymentLink;
      } else {
        throw new Error('Payment link not received');
      }
    } catch (error) {
      console.error('Error during payment process:', error);
      alert('Der opstod en fejl under betalingsprocessen. Prøv igen senere.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // RENDER
  return (
    <div id="order-confirmation">
      <h2 className="text-2xl font-bold mb-4">Bekræft Ordre</h2>

      {/* Order Summary */}
      <div className="mb-8">
        <h3 className="text-xl font-bold mb-4">Ordreoversigt</h3>
        {/* Delivery Option */}
        <div className="mb-4">
          <h4 className="font-bold">Leveringstype:</h4>
          <p>{deliveryOption === 'pickupPoint' ? 'Afhentningssted' : 'Hjemmelevering'}</p>
        </div>
        {/* Delivery Address */}
        <div className="mb-4">
          <h4 className="font-bold">Leveringsadresse:</h4>
          <p>{deliveryAddress.name || ''}</p>
          <p>
            {deliveryAddress.streetName || ''} {deliveryAddress.streetNumber || ''}
          </p>
          <p>
            {deliveryAddress.postalCode || ''} {deliveryAddress.city || ''}
          </p>
          <p>{deliveryAddress.country || ''}</p>
        </div>
        {/* Customer Details */}
        <div className="mb-4">
          <h4 className="font-bold">Kundeoplysninger:</h4>
          <p>Navn: {customerDetails.fullName}</p>
          <p>Email: {customerDetails.email}</p>
          <p>Telefon: {customerDetails.mobileNumber}</p>
        </div>
        {/* Order Details */}
        <div className="mb-4">
          <h4 className="font-bold">Ordre Detaljer:</h4>
          <p>Antal pakker: {basketItems.reduce((acc, item) => acc + item.quantity, 0)}</p>
          <p>Total pris: {((totalPrice + totalRecyclingFee) / 100).toFixed(2)} kr</p>
          <p>Pant: {(totalRecyclingFee / 100).toFixed(2)} kr</p>
          <p>
            Leveringsgebyr:{' '}
            {basketSummary?.deliveryDetails?.deliveryFee
              ? (basketSummary.deliveryDetails.deliveryFee / 100).toFixed(2) + ' kr'
              : 'Gratis'}
          </p>
        </div>
      </div>

      {/* Total Price Including VAT */}
      <div className="mt-8 text-center">
        <div className="text-lg font-semibold">I alt at betale inkl. moms</div>
        <h3 className="text-2xl font-bold">
          {(
            (totalPrice +
              totalRecyclingFee +
              (basketSummary?.deliveryDetails?.deliveryFee || 0)) /
            100
          ).toFixed(2)}{' '}
          kr.
        </h3>
      </div>

      {/* Terms and Conditions */}
      <div className="mt-4 flex justify-center">
        <label className="flex items-center">
          <input
            required
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => {
              setTermsAccepted(e.target.checked);
              setTermsError('');
            }}
            className="mr-2"
          />
          <span>
            Jeg har læst og accepteret{' '}
            <a
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
              href="/handelsbetingelser"
            >
              handelsbetingelser
            </a>
            .
          </span>
        </label>
      </div>
      {termsError && <p className="text-red-600 text-center mt-2">{termsError}</p>}

      {/* Submit Button */}
      <div className="mt-8 flex justify-center">
        <LoadingButton
          onClick={handlePayment}
          loading={isProcessingPayment}
          className="bg-customYellow text-white px-6 py-2 rounded-full shadow hover:bg-customOrange transition"
        >
          GENNEMFØR KØB
        </LoadingButton>
      </div>
    </div>
  );
};

export default OrderConfirmation;
