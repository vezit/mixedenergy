import React, { useState, useEffect } from 'react';
import LoadingButton from './LoadingButton';
import { useRouter } from 'next/router';
import { useBasket } from './BasketContext';

const OrderConfirmation = ({
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
  const { clearBasket } = useBasket();

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

  const [deliveryAddress, setDeliveryAddress] = useState({});

  useEffect(() => {
    if (
      basketSummary &&
      basketSummary.deliveryDetails &&
      basketSummary.deliveryDetails.deliveryAddress
    ) {
      setDeliveryAddress(basketSummary.deliveryDetails.deliveryAddress);
    } else {
      // Construct delivery address based on current selections
      if (deliveryOption === 'pickupPoint') {
        // Use the selected pickup point details if available
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
        // Use customerDetails address
        const { streetName, streetNumber } = splitAddress(customerDetails.address || '');
        setDeliveryAddress({
          name: customerDetails.fullName,
          streetName: streetName,
          streetNumber: streetNumber,
          postalCode: customerDetails.postalCode,
          city: customerDetails.city,
          country: 'Danmark',
        });
      }
    }
  }, [basketSummary, customerDetails, deliveryOption, selectedPoint]);

  const handlePayment = async () => {
    // Set submitAttempted to true
    setSubmitAttempted(true);

    // Validate customer details
    const requiredFields = ['fullName', 'mobileNumber', 'email', 'address', 'postalCode', 'city'];
    let customerDetailsValid = true;

    const newErrors = { ...errors };
    const newTouchedFields = { ...touchedFields };

    requiredFields.forEach((field) => {
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
      document.getElementById('customer-details').scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Validate delivery details
    if (deliveryOption === 'pickupPoint' && !selectedPoint) {
      // Scroll to delivery options section
      document.getElementById('shipping-and-payment').scrollIntoView({ behavior: 'smooth' });
      alert('Vælg venligst et afhentningssted.');
      return;
    }

    if (deliveryOption === 'homeDelivery') {
      const requiredDeliveryFields = ['name', 'streetName', 'postalCode', 'city', 'country'];
      const deliveryValid = requiredDeliveryFields.every(
        (field) => deliveryAddress[field] && deliveryAddress[field].trim()
      );
      if (!deliveryValid) {
        document.getElementById('customer-details').scrollIntoView({ behavior: 'smooth' });
        alert('Udfyld venligst alle leveringsdetaljer.');
        return;
      }
    }

    // Check if basket is empty
    if (!basketItems || basketItems.length === 0) {
      // Redirect to home page
      window.location.href = '/';
      return;
    }

    if (!termsAccepted) {
      setTermsError(
        'Du skal acceptere vores handelsbetingelser før du kan fortsætte. Sæt venligst flueben i boksen herover.'
      );
      // Scroll to terms section
      document.getId('order-confirmation').scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setIsProcessingPayment(true);
    try {
      // Step 1: Ensure delivery details are updated in backend
      await updateDeliveryDetailsInBackend(deliveryOption, { selectedPickupPoint: selectedPoint });

      // Step 2: Create Order and initiate payment
      const response = await fetch('/api/firebase/6-createOrder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const data = await response.json();

      if (data.paymentLink) {
        // Redirect user to payment link
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

  return (
    <div id="order-confirmation">
      <h2 className="text-2xl font-bold mb-4">Bekræft Ordre</h2>
      {/* Order Summary */}
      <div className="mb-8">
        <h3 className="text-xl font-bold mb-4">Ordreoversigt</h3>
        {/* Display the summary */}
        <div className="mb-4">
          <h4 className="font-bold">Leveringstype:</h4>
          <p>{deliveryOption === 'pickupPoint' ? 'Afhentningssted' : 'Hjemmelevering'}</p>
        </div>
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
        <div className="mb-4">
          <h4 className="font-bold">Kundeoplysninger:</h4>
          <p>Navn: {customerDetails.fullName}</p>
          <p>Email: {customerDetails.email}</p>
          <p>Telefon: {customerDetails.mobileNumber}</p>
        </div>
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
