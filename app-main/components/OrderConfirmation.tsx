import React, { FC, useState } from 'react';
import LoadingButton from './LoadingButton';
import { useRouter } from 'next/router';
import { useBasket } from './BasketContext';
import { ICustomerDetails } from '../types/ICustomerDetails';

export interface IDeliveryAddress {
  name?: string;
  address?: string;      // might still be used for pickup point addresses
  postalCode?: string;
  city?: string;
  country?: string;
  streetName?: string;   // used for home delivery
  streetNumber?: string; // used for home delivery
  [key: string]: any;
}

export interface IBasketItem {
  quantity: number;
  totalPrice?: number;
  totalRecyclingFee?: number;
}

export interface IBasketSummary {
  deliveryDetails?: {
    deliveryOption?: string; // e.g. 'pickupPoint' | 'homeDelivery'
    deliveryAddress?: IDeliveryAddress;
    deliveryFee?: number; // in øre
    providerDetails?: any;
  };
}

interface ErrorMap {
  [field: string]: string;
}

interface TouchedFieldsMap {
  [field: string]: boolean;
}

interface OrderConfirmationProps {
  customerDetails: ICustomerDetails;
  deliveryOption: string;
  selectedPoint: any;
  updateDeliveryDetailsInBackend: (
    deliveryOption: string,
    extras?: { selectedPickupPoint?: any }
  ) => Promise<void>;
  totalPrice: number;
  totalRecyclingFee: number;
  basketItems: IBasketItem[];
  basketSummary?: IBasketSummary | null;
  errors: ErrorMap;
  setErrors: React.Dispatch<React.SetStateAction<ErrorMap>>;
  touchedFields: TouchedFieldsMap;
  setTouchedFields: React.Dispatch<React.SetStateAction<TouchedFieldsMap>>;
  submitAttempted: boolean;
  setSubmitAttempted: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Helper to join streetName + streetNumber 
 * into a single string like "Vinkelvej 12D, 3tv".
 */
function formatAddress(deliveryAddress: IDeliveryAddress): string {
  if (!deliveryAddress) return '';
  const { streetName, streetNumber } = deliveryAddress;
  // Filter out falsy values, join them with a space
  return [streetName, streetNumber].filter(Boolean).join(' ');
}

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
  const basketContext = useBasket();

  // The address from the DB if it exists
  const finalDeliveryAddress = basketSummary?.deliveryDetails?.deliveryAddress || {};
  // The final type from the DB or fallback to local
  const finalDeliveryOption =
    basketSummary?.deliveryDetails?.deliveryOption || deliveryOption;

  /**
   * Called when the user clicks "Gennemfør køb"
   */
  const handlePayment = async () => {
    setSubmitAttempted(true);

    // 1) Basic client-side validation
    const requiredFields = [
      'fullName',
      'mobileNumber',
      'email',
      'address',
      'postalCode',
      'city',
    ] as const;

    const newErrors: ErrorMap = { ...errors };
    const newTouchedFields: TouchedFieldsMap = { ...touchedFields };

    let customerDetailsValid = true;
    for (const field of requiredFields) {
      if (!customerDetails[field] || !customerDetails[field].trim()) {
        newErrors[field] = 'Dette felt er påkrævet';
        newTouchedFields[field] = true;
        customerDetailsValid = false;
      }
    }

    setErrors(newErrors);
    setTouchedFields(newTouchedFields);

    if (!customerDetailsValid) {
      document
        .getElementById('customer-details')
        ?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // If pickupPoint is chosen but no point selected
    if (finalDeliveryOption === 'pickupPoint') {
      if (!selectedPoint) {
        document
          .getElementById('shipping-and-payment')
          ?.scrollIntoView({ behavior: 'smooth' });
        alert('Vælg venligst et afhentningssted.');
        return;
      }
    }

    // If basket is empty
    if (!basketItems || basketItems.length === 0) {
      router.push('/');
      return;
    }

    // Check terms acceptance
    if (!termsAccepted) {
      setTermsError(
        'Du skal acceptere vores handelsbetingelser før du kan fortsætte. ' +
          'Sæt venligst flueben i boksen herover.'
      );
      document
        .getElementById('order-confirmation')
        ?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // 2) Attempt Payment flow
    setIsProcessingPayment(true);
    try {
      // 2a) Update session with final details
      await updateDeliveryDetailsInBackend(finalDeliveryOption, {
        selectedPickupPoint: selectedPoint,
      });

      // 2b) Possibly create an order ID
      const orderId = 'ORDER-' + Date.now();

      // 2c) total in øre
      const deliveryFee = basketSummary?.deliveryDetails?.deliveryFee || 0;
      const totalAmount = totalPrice + totalRecyclingFee + deliveryFee;

      // 3) Create Payment
      const createPaymentRes = await fetch('/api/quickpay/createPayment', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customOrderId: orderId,
        }),
      });
      if (!createPaymentRes.ok) {
        throw new Error('Failed to create payment in QuickPay');
      }
      const { paymentId } = await createPaymentRes.json();
      if (!paymentId) {
        throw new Error('No paymentId returned from createPayment');
      }

      // 4) Get Payment Link
      const getPaymentLinkRes = await fetch(
        `/api/quickpay/getPaymentLink/${paymentId}?amount=${totalAmount}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );
      if (!getPaymentLinkRes.ok) {
        throw new Error('Failed to get payment link from QuickPay');
      }

      const linkData = await getPaymentLinkRes.json();
      if (!linkData.linkUrl) {
        throw new Error('No linkUrl returned from QuickPay');
      }

      // 5) Redirect to QuickPay’s hosted window
      window.location.href = linkData.linkUrl;
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

      {/* Ordreoversigt */}
      <div className="mb-8">
        <h3 className="text-xl font-bold mb-4">Ordreoversigt</h3>

        <div className="mb-4">
          <h4 className="font-bold">Leveringstype:</h4>
          <p>
            {finalDeliveryOption === 'pickupPoint' ? 'Afhentningssted' : 'Hjemmelevering'}
          </p>
        </div>

        <div className="mb-4">
          <h4 className="font-bold">Leveringsadresse:</h4>
          {/* 
             If "pickupPoint," you might use finalDeliveryAddress.address 
             Instead, for homeDelivery, we show streetName + streetNumber 
          */}
          <p>{finalDeliveryAddress.name || ''}</p>

          {/* 
            Join streetName + streetNumber (like payment-success / email).
            If it's a pickupPoint, maybe finalDeliveryAddress.address still
            works. You can handle that logic however you wish.
          */}
          <p>
            {finalDeliveryOption === 'pickupPoint'
              ? finalDeliveryAddress.address || '' // for pickup points
              : formatAddress(finalDeliveryAddress) // for home delivery
            }
          </p>

          <p>
            {finalDeliveryAddress.postalCode || ''}{' '}
            {finalDeliveryAddress.city || ''}
          </p>
          <p>{finalDeliveryAddress.country || ''}</p>
        </div>

        <div className="mb-4">
          <h4 className="font-bold">Kundeoplysninger:</h4>
          <p>Navn: {customerDetails.fullName}</p>
          <p>Email: {customerDetails.email}</p>
          <p>Telefon: {customerDetails.mobileNumber}</p>
        </div>

        <div className="mb-4">
          <h4 className="font-bold">Ordre Detaljer:</h4>
          <p>
            Antal pakker: {basketItems.reduce((acc, item) => acc + item.quantity, 0)}
          </p>
          <p>
            Total pris: {((totalPrice + totalRecyclingFee) / 100).toFixed(2)} kr
          </p>
          <p>Pant: {(totalRecyclingFee / 100).toFixed(2)} kr</p>
          <p>
            Leveringsgebyr:{' '}
            {basketSummary?.deliveryDetails?.deliveryFee
              ? (basketSummary.deliveryDetails.deliveryFee / 100).toFixed(2) + ' kr'
              : 'Gratis'}
          </p>
        </div>
      </div>

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
