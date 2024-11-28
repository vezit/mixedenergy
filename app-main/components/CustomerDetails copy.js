// components/CustomerDetails.js

import React, { useCallback, useEffect } from 'react';
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

const CustomerDetails = ({
  customerDetails,
  updateCustomerDetails,
  updateDeliveryDetailsInBackend,
  errors,
  setErrors,
  touchedFields,
  setTouchedFields,
}) => {
  // Debounce function to prevent excessive API calls
  const debounce = (func, delay) => {
    let timeoutId;
    return function (...args) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  // Function to update customer details in Firebase
  const updateCustomerDetailsInFirebase = async (updatedDetails) => {
    try {
      console.log('Updating customer details in Firebase:', updatedDetails);
      const response = await fetch('/api/firebase/4-updateBasket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateCustomerDetails',
          customerDetails: updatedDetails,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle errors returned from the server
        setErrors(data.errors || {});
        throw new Error(data.error || 'Error updating customer details');
      } else {
        // Clear errors if any
        setErrors({});
      }
    } catch (error) {
      console.error('Error updating customer details in Firebase:', error);
    }
  };

  // Debounced function
  const debouncedUpdateCustomerDetailsInFirebase = useCallback(
    debounce(updateCustomerDetailsInFirebase, 1000),
    []
  );

  const validateField = (name, value) => {
    if (!value || !value.trim()) {
      return '!HERO Please fill out this field';
    }
    if (name === 'mobileNumber') {
      const mobileNumberRegex = /^\d{8}$/;
      if (!mobileNumberRegex.test(value.trim())) {
        return '!HERO Please enter a valid mobile number';
      }
    } else if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.trim())) {
        return '!HERO Please enter a valid email address';
      }
    } else if (name === 'postalCode') {
      const postalCodeRegex = /^\d{4}$/;
      if (!postalCodeRegex.test(value.trim())) {
        return '!HERO Please enter a valid postal code';
      }
    }
    return null;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const updatedDetails = { ...customerDetails, [name]: value };
    updateCustomerDetails(updatedDetails); // Updates the context

    // Perform client-side validation
    const error = validateField(name, value);
    setErrors((prevErrors) => ({ ...prevErrors, [name]: error }));
  };

  // Function to validate address using DAWA API
  const validateAddressWithDAWA = async (fullAddress) => {
    try {
      const response = await fetch('/api/dawa/validateAddress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: fullAddress }),
      });

      const result = await response.json();

      if (response.ok) {
        const { data } = result;

        // Extract the standardized address components
        const adresse = data.aktueladresse;

        const updatedDetails = {
          ...customerDetails,
          address: `${adresse.vejnavn} ${adresse.husnr}${
            adresse.etage ? ', ' + adresse.etage + '.' : ''
          }${adresse.dør ? ' ' + adresse.dør : ''}`,
          postalCode: adresse.postnr,
          city: adresse.postnrnavn,
        };

        // Update customer details with validated address
        updateCustomerDetails(updatedDetails);

        // Update delivery details in backend
        updateDeliveryDetailsInBackend('homeDelivery', {});

        // Clear any address errors
        setErrors((prevErrors) => ({ ...prevErrors, address: null }));
      } else {
        // Address could not be validated
        setErrors((prevErrors) => ({ ...prevErrors, address: result.error }));
      }
    } catch (error) {
      console.error('Error validating address:', error);
      setErrors((prevErrors) => ({ ...prevErrors, address: 'Fejl ved validering af adresse' }));
    }
  };

  const handleInputBlur = (fieldName) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));

    // Get the updated customerDetails from context
    const updatedDetails = customerDetails;

    // Perform client-side validation
    const error = validateField(fieldName, updatedDetails[fieldName]);
    setErrors((prevErrors) => ({ ...prevErrors, [fieldName]: error }));

    // If the field is 'address', call DAWA API to validate
    if (fieldName === 'address' && !error) {
      const fullAddress = `${customerDetails.address}, ${customerDetails.postalCode} ${customerDetails.city}`;
      validateAddressWithDAWA(fullAddress);
    } else {
      // Make API call to update customer details
      debouncedUpdateCustomerDetailsInFirebase(updatedDetails);
    }

    // Update delivery details in backend if necessary
    if (['address', 'postalCode', 'city'].includes(fieldName)) {
      updateDeliveryDetailsInBackend('homeDelivery', {});
    }
  };

  const allFieldsValid = () => {
    const requiredFields = ['fullName', 'mobileNumber', 'email', 'address', 'postalCode', 'city'];
    return requiredFields.every(
      (field) => !errors[field] && customerDetails[field] && customerDetails[field].trim()
    );
  };

  // Add this useEffect to initialize touchedFields and errors
  useEffect(() => {
    if (!customerDetails) return; // Ensure customerDetails is available

    const fields = ['fullName', 'mobileNumber', 'email', 'address', 'postalCode', 'city'];
    const newTouchedFields = {};
    const newErrors = {};

    fields.forEach((field) => {
      const value = customerDetails[field];
      if (value !== undefined && value !== null && value !== '') {
        newTouchedFields[field] = true;
        const error = validateField(field, value);
        if (error) {
          newErrors[field] = error;
        }
      }
    });

    setTouchedFields((prev) => ({ ...prev, ...newTouchedFields }));
    setErrors((prev) => ({ ...prev, ...newErrors }));
  }, [customerDetails]);

  return (
    <div id="customer-details">
      <h2 className="text-2xl font-bold mb-4">Kundeoplysninger</h2>
      <form>
        {/* Full Name */}
        <div className="mb-5 relative">
          <input
            type="text"
            name="fullName"
            id="fullName"
            value={customerDetails.fullName || ''}
            onBlur={() => handleInputBlur('fullName')}
            onChange={handleInputChange}
            className={`peer w-full px-3 pt-2 pb-2 border rounded font-semibold focus:outline-none`}
            placeholder=" "
          />
          <label
            htmlFor="fullName"
            className={`absolute left-3 text-gray-500 pointer-events-none font-semibold
                    ${customerDetails.fullName ? 'top-0 text-xs' : 'top-2 text-base'}
                  `}
          >
            Navn *
          </label>
          {/* SVG icon */}
          {touchedFields.fullName && errors.fullName ? (
            <ExclamationCircleIcon className="absolute right-3 top-2.5 h-6 w-6 text-red-600" />
          ) : touchedFields.fullName && !errors.fullName ? (
            <CheckCircleIcon className="absolute right-3 top-2.5 h-6 w-6 text-green-500" />
          ) : null}
          {errors.fullName && (
            <p className="text-orange-500 text-sm mt-1 absolute">{errors.fullName}</p>
          )}
        </div>

        {/* Mobile Number */}
        <div className="mb-5 relative">
          <input
            type="text"
            name="mobileNumber"
            id="mobileNumber"
            value={customerDetails.mobileNumber || ''}
            onBlur={() => handleInputBlur('mobileNumber')}
            onChange={handleInputChange}
            className={`peer w-full px-3 pt-2 pb-2 border rounded font-semibold focus:outline-none`}
            placeholder=" "
          />
          <label
            htmlFor="mobileNumber"
            className={`absolute left-3 text-gray-500 pointer-events-none font-semibold
                    ${customerDetails.mobileNumber ? 'top-0 text-xs' : 'top-2 text-base'}
                  `}
          >
            Mobilnummer *
          </label>
          {touchedFields.mobileNumber && errors.mobileNumber ? (
            <ExclamationCircleIcon className="absolute right-3 top-2.5 h-6 w-6 text-red-600" />
          ) : touchedFields.mobileNumber && !errors.mobileNumber ? (
            <CheckCircleIcon className="absolute right-3 top-2.5 h-6 w-6 text-green-500" />
          ) : null}
          {errors.mobileNumber && (
            <p className="text-orange-500 text-sm mt-1 absolute">{errors.mobileNumber}</p>
          )}
        </div>

        {/* Email */}
        <div className="mb-5 relative">
          <input
            type="email"
            name="email"
            id="email"
            value={customerDetails.email || ''}
            onBlur={() => handleInputBlur('email')}
            onChange={handleInputChange}
            className={`peer w-full px-3 pt-2 pb-2 border rounded font-semibold focus:outline-none`}
            placeholder=" "
          />
          <label
            htmlFor="email"
            className={`absolute left-3 text-gray-500 pointer-events-none font-semibold
                    ${customerDetails.email ? 'top-0 text-xs' : 'top-2 text-base'}
                  `}
          >
            E-mail *
          </label>
          {touchedFields.email && errors.email ? (
            <ExclamationCircleIcon className="absolute right-3 top-2.5 h-6 w-6 text-red-600" />
          ) : touchedFields.email && !errors.email ? (
            <CheckCircleIcon className="absolute right-3 top-2.5 h-6 w-6 text-green-500" />
          ) : null}
          {errors.email && (
            <p className="text-orange-500 text-sm mt-1 absolute">{errors.email}</p>
          )}
        </div>

        {/* Address */}
        <div className="mb-5 relative">
          <input
            type="text"
            name="address"
            id="address"
            value={customerDetails.address || ''}
            onBlur={() => handleInputBlur('address')}
            onChange={handleInputChange}
            className={`peer w-full px-3 pt-2 pb-2 border rounded font-semibold focus:outline-none ${
              errors.address ? 'border-orange-500' : ''
            }`}
            placeholder=" "
          />
          <label
            htmlFor="address"
            className={`absolute left-3 text-gray-500 pointer-events-none font-semibold
                    ${customerDetails.address ? 'top-0 text-xs' : 'top-2 text-base'}
                  `}
          >
            Adresse *
          </label>
          {touchedFields.address && errors.address ? (
            <ExclamationCircleIcon className="absolute right-3 top-2.5 h-6 w-6 text-red-600" />
          ) : touchedFields.address && !errors.address ? (
            <CheckCircleIcon className="absolute right-3 top-2.5 h-6 w-6 text-green-500" />
          ) : null}
          {errors.address && (
            <p className="text-orange-500 text-sm mt-1 absolute">{errors.address}</p>
          )}
        </div>

        {/* Postal Code */}
        <div className="mb-5 relative">
          <input
            type="text"
            name="postalCode"
            id="postalCode"
            value={customerDetails.postalCode || ''}
            onBlur={() => handleInputBlur('postalCode')}
            onChange={handleInputChange}
            className={`peer w-full px-3 pt-2 pb-2 border rounded font-semibold focus:outline-none`}
            placeholder=" "
          />
          <label
            htmlFor="postalCode"
            className={`absolute left-3 text-gray-500 pointer-events-none font-semibold
                    ${customerDetails.postalCode ? 'top-0 text-xs' : 'top-2 text-base'}
                  `}
          >
            Postnummer *
          </label>
          {touchedFields.postalCode && errors.postalCode ? (
            <ExclamationCircleIcon className="absolute right-3 top-2.5 h-6 w-6 text-red-600" />
          ) : touchedFields.postalCode && !errors.postalCode ? (
            <CheckCircleIcon className="absolute right-3 top-2.5 h-6 w-6 text-green-500" />
          ) : null}
          {errors.postalCode && (
            <p className="text-orange-500 text-sm mt-1 absolute">{errors.postalCode}</p>
          )}
        </div>

        {/* City */}
        <div className="mb-5 relative">
          <input
            type="text"
            name="city"
            id="city"
            value={customerDetails.city || ''}
            onBlur={() => handleInputBlur('city')}
            onChange={handleInputChange}
            className={`peer w-full px-3 pt-2 pb-2 border rounded font-semibold focus:outline-none`}
            placeholder=" "
          />
          <label
            htmlFor="city"
            className={`absolute left-3 text-gray-500 pointer-events-none font-semibold
                    ${customerDetails.city ? 'top-0 text-xs' : 'top-2 text-base'}
                  `}
          >
            By *
          </label>
          {touchedFields.city && errors.city ? (
            <ExclamationCircleIcon className="absolute right-3 top-2.5 h-6 w-6 text-red-600" />
          ) : touchedFields.city && !errors.city ? (
            <CheckCircleIcon className="absolute right-3 top-2.5 h-6 w-6 text-green-500" />
          ) : null}
          {errors.city && (
            <p className="text-orange-500 text-sm mt-1 absolute">{errors.city}</p>
          )}
        </div>

        {/* Country */}
        <div className="mb-5 relative">
          <input
            type="text"
            name="country"
            id="country"
            value="Danmark"
            onChange={handleInputChange}
            className="w-full px-3 pt-2 pb-2 border rounded bg-gray-100 cursor-not-allowed font-semibold"
            disabled
          />
          <label
            htmlFor="country"
            className="absolute left-3 text-gray-500 pointer-events-none font-semibold top-0 text-xs"
          >
            Land
          </label>
          {/* Show CheckCircleIcon when all fields are valid and have been touched */}
          {allFieldsValid() && Object.values(touchedFields).every((touched) => touched) && (
            <CheckCircleIcon className="absolute right-3 top-2.5 h-6 w-6 text-green-500" />
          )}
        </div>
      </form>
    </div>
  );
};

export default CustomerDetails;
