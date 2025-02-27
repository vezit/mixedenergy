import React, { FC, useState } from 'react';
import LoadingButton from './LoadingButton';
import { useRouter } from 'next/router';
import { useBasket } from './BasketContext';
import { ICustomerDetails } from '../types/ICustomerDetails';

export interface IDeliveryAddress {
  name?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  streetName?: string;
  streetNumber?: string;
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
    deliveryFee?: number; // in "øre"
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

  // The address that we actually show in the “Ordreoversigt,”
  // coming straight from the DB if it exists.
  const finalDeliveryAddress = basketSummary?.deliveryDetails?.deliveryAddress || {};

  // For clarity, read the server’s “deliveryOption” or fallback to local
  const finalDeliveryOption = basketSummary?.deliveryDetails?.deliveryOption || deliveryOption;

  /**
   * Handle "Betal" or "Gennemfør køb" logic
   */
  const handlePayment = async () => {
    setSubmitAttempted(true);
  
    // 1) Basic client-side validation for required fields
    const requiredFields = ['fullName', 'mobileNumber', 'email', 'address', 'postalCode', 'city'] as const;

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
      document.getElementById('customer-details')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
  
    // If pickupPoint is chosen but none is selected
    if (finalDeliveryOption === 'pickupPoint') {
      if (!selectedPoint) {
        document.getElementById('shipping-and-payment')?.scrollIntoView({ behavior: 'smooth' });
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
      document.getElementById('order-confirmation')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
  
    // 2) Attempt the Payment flow
    setIsProcessingPayment(true);
    try {
      // 2a) Update server's delivery details so basketSummary is synced
      await updateDeliveryDetailsInBackend(finalDeliveryOption, {
        selectedPickupPoint: selectedPoint,
      });
  
      // 2b) (Optional) Generate an order ID or retrieve from database
      //     This is NOT strictly required by QuickPay if you’re already
      //     using session_id or something else as the order_id.
      const orderId = 'ORDER-' + Date.now();
  
      // 2c) Calculate total amount in øre (including potential delivery fees, pant, etc.)
      const deliveryFee = basketSummary?.deliveryDetails?.deliveryFee || 0;
      const totalAmount = totalPrice + totalRecyclingFee + deliveryFee; // in øre
  
      // 3) CREATE the QuickPay "payment" object (via your /api/quickpay/createPayment)
      const createPaymentRes = await fetch('/api/quickpay/createPayment', {
        method: 'POST',
        credentials: 'include', // if you need cookies
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // If you want to pass in the "order_id" or any extra info:
          customOrderId: orderId,
          // Possibly pass in the totalAmount here or store it in your DB.
        }),
      });
  
      if (!createPaymentRes.ok) {
        throw new Error('Failed to create payment in QuickPay');
      }
  
      const { paymentId } = await createPaymentRes.json();
      if (!paymentId) {
        throw new Error('No paymentId returned from createPayment');
      }
  
      // 4) GET the Payment Link (via your /api/quickpay/getPaymentLink/[paymentId])
      //    This will finalize the link with amount, callback_url, etc.
      const getPaymentLinkRes = await fetch(`/api/quickpay/getPaymentLink/${paymentId}?amount=${totalAmount}`, {
        method: 'GET',
        credentials: 'include', // if you need cookies
      });
  
      if (!getPaymentLinkRes.ok) {
        throw new Error('Failed to get payment link from QuickPay');
      }
  
      const linkData = await getPaymentLinkRes.json();
      if (!linkData.linkUrl) {
        throw new Error('No linkUrl returned from QuickPay');
      }
  
      // 5) Redirect the user to QuickPay’s hosted payment window
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
          <p>{finalDeliveryOption === 'pickupPoint' ? 'Afhentningssted' : 'Hjemmelevering'}</p>
        </div>

        <div className="mb-4">
          <h4 className="font-bold">Leveringsadresse:</h4>
          <p>{finalDeliveryAddress.name || ''}</p>
          <p>{finalDeliveryAddress.address || ''}</p>
          <p>
            {finalDeliveryAddress.postalCode || ''} {finalDeliveryAddress.city || ''}
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
