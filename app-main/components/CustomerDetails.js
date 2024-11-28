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
  submitAttempted,
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
      return 'This field is required';
    }
    if (name === 'mobileNumber') {
      const mobileNumberRegex = /^\d{8}$/;
      if (!mobileNumberRegex.test(value.trim())) {
        return 'Please enter a valid 8-digit mobile number';
      }
    } else if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.trim())) {
        return 'Please enter a valid email address';
      }
    } else if (name === 'postalCode') {
      const postalCodeRegex = /^\d{4}$/;
      if (!postalCodeRegex.test(value.trim())) {
        return 'Please enter a valid 4-digit postal code';
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

    // Sync with Firebase
    debouncedUpdateCustomerDetailsInFirebase(updatedDetails);
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
      setErrors((prevErrors) => ({ ...prevErrors, address: 'Error validating address' }));
    }
  };

  const handleInputBlur = (fieldName) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));

    // Get the updated customerDetails from context
    const updatedDetails = customerDetails;

    // Perform client-side validation
    const error = validateField(fieldName, updatedDetails[fieldName]);
    setErrors((prevErrors) => ({ ...prevErrors, [fieldName]: error }));


    // Make API call to update customer details
    debouncedUpdateCustomerDetailsInFirebase(updatedDetails);
    

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

  // Initialize touchedFields and errors on component mount
  useEffect(() => {
    if (!customerDetails) return; // Ensure customerDetails is available

    const fields = ['fullName', 'mobileNumber', 'email', 'address', 'postalCode', 'city'];
    const newErrors = {};

    fields.forEach((field) => {
      const value = customerDetails[field];
      const error = validateField(field, value);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors((prev) => ({ ...prev, ...newErrors }));
  }, [customerDetails]);

  // Function to render icons
  const renderIcon = (fieldName) => {
    if (errors[fieldName]) {
      return (
        <ExclamationCircleIcon className="absolute right-3 top-2.5 h-6 w-6 text-red-600" />
      );
    } else if (customerDetails[fieldName]) {
      return (
        <CheckCircleIcon className="absolute right-3 top-2.5 h-6 w-6 text-green-500" />
      );
    }
    return null;
  };

  return (
    <div id="customer-details">
      <h2 className="text-2xl font-bold mb-4">Kundeoplysninger</h2>
      <form>
        {/* Full Name */}
        <div className="mb-9 relative">
          <input
            type="text"
            name="fullName"
            id="fullName"
            value={customerDetails.fullName || ''}
            onBlur={() => handleInputBlur('fullName')}
            onChange={handleInputChange}
            className="peer w-full h-10 px-3 pt-4 pb-2 border rounded font-semibold focus:outline-none"
            placeholder=" "
          />
          <label
            htmlFor="fullName"
            className={`absolute left-3 text-gray-500 pointer-events-none font-semibold transition-all
              ${customerDetails.fullName ? 'top-0 text-xs' : 'top-2 text-base'}
            `}
          >
            Navn *
          </label>
          {/* SVG icon */}
          {renderIcon('fullName')}
          {errors.fullName && submitAttempted && (
            <p className="text-orange-500 text-sm mt-1 absolute">
              <ExclamationCircleIcon className="inline h-4 w-4 mr-1" />
              {errors.fullName}
            </p>
          )}
        </div>

        {/* Mobile Number */}
        <div className="mb-9 relative">
          <input
            type="text"
            name="mobileNumber"
            id="mobileNumber"
            value={customerDetails.mobileNumber || ''}
            onBlur={() => handleInputBlur('mobileNumber')}
            onChange={handleInputChange}
            className="peer w-full h-10 px-3 pt-4 pb-2 border rounded font-semibold focus:outline-none"
            placeholder=" "
          />
          <label
            htmlFor="mobileNumber"
            className={`absolute left-3 text-gray-500 pointer-events-none font-semibold transition-all
              ${customerDetails.mobileNumber ? 'top-0 text-xs' : 'top-2 text-base'}
            `}
          >
            Mobilnummer *
          </label>
          {renderIcon('mobileNumber')}
          {errors.mobileNumber && submitAttempted && (
            <p className="text-orange-500 text-sm mt-1 absolute">
              <ExclamationCircleIcon className="inline h-4 w-4 mr-1" />
              {errors.mobileNumber}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="mb-9 relative">
          <input
            type="email"
            name="email"
            id="email"
            value={customerDetails.email || ''}
            onBlur={() => handleInputBlur('email')}
            onChange={handleInputChange}
            className="peer w-full px-3 h-10 pt-4 pb-2 border rounded font-semibold focus:outline-none"
            placeholder=" "
          />
          <label
            htmlFor="email"
            className={`absolute left-3 text-gray-500 pointer-events-none font-semibold transition-all
              ${customerDetails.email ? 'top-0 text-xs' : 'top-2 text-base'}
            `}
          >
            E-mail *
          </label>
          {renderIcon('email')}
          {errors.email && submitAttempted && (
            <p className="text-orange-500 text-sm mt-1 absolute">
              <ExclamationCircleIcon className="inline h-4 w-4 mr-1" />
              {errors.email}
            </p>
          )}
        </div>

        {/* Address */}
        <div className="mb-9 relative">
          <input
            type="text"
            name="address"
            id="address"
            value={customerDetails.address || ''}
            onBlur={() => handleInputBlur('address')}
            onChange={handleInputChange}
            className="peer w-full px-3 h-10 pt-4 pb-2 border rounded font-semibold focus:outline-none"
            placeholder=" "
          />
          <label
            htmlFor="address"
            className={`absolute left-3 text-gray-500 pointer-events-none font-semibold transition-all
              ${customerDetails.address ? 'top-0 text-xs' : 'top-2 text-base'}
            `}
          >
            Adresse *
          </label>
          {renderIcon('address')}
          {errors.address && submitAttempted && (
            <p className="text-orange-500 text-sm mt-1 absolute">
              <ExclamationCircleIcon className="inline h-4 w-4 mr-1" />
              {errors.address}
            </p>
          )}
        </div>

        {/* Postal Code */}
        <div className="mb-9 relative">
          <input
            type="text"
            name="postalCode"
            id="postalCode"
            value={customerDetails.postalCode || ''}
            onBlur={() => handleInputBlur('postalCode')}
            onChange={handleInputChange}
            className="peer w-full px-3 h-10 pt-4 pb-2 border rounded font-semibold focus:outline-none"
            placeholder=" "
          />
          <label
            htmlFor="postalCode"
            className={`absolute left-3 text-gray-500 pointer-events-none font-semibold transition-all
              ${customerDetails.postalCode ? 'top-0 text-xs' : 'top-2 text-base'}
            `}
          >
            Postnummer *
          </label>
          {renderIcon('postalCode')}
          {errors.postalCode && submitAttempted && (
            <p className="text-orange-500 text-sm mt-1 absolute">
              <ExclamationCircleIcon className="inline h-4 w-4 mr-1" />
              {errors.postalCode}
            </p>
          )}
        </div>

        {/* City */}
        <div className="mb-9 relative">
          <input
            type="text"
            name="city"
            id="city"
            value={customerDetails.city || ''}
            onBlur={() => handleInputBlur('city')}
            onChange={handleInputChange}
            className="peer w-full px-3 h-10 pt-4 pb-2 border rounded font-semibold focus:outline-none"
            placeholder=" "
          />
          <label
            htmlFor="city"
            className={`absolute left-3 text-gray-500 pointer-events-none font-semibold transition-all
              ${customerDetails.city ? 'top-0 text-xs' : 'top-2 text-base'}
            `}
          >
            By *
          </label>
          {renderIcon('city')}
          {errors.city && submitAttempted && (
            <p className="text-orange-500 text-sm mt-1 absolute">
              <ExclamationCircleIcon className="inline h-4 w-4 mr-1" />
              {errors.city}
            </p>
          )}
        </div>

        {/* Country */}
        <div className="mb-9 relative">
          <input
            type="text"
            name="country"
            id="country"
            value="Danmark"
            onChange={handleInputChange}
            className="w-full px-3 pt-4 h-10 pb-2 border rounded bg-gray-100 cursor-not-allowed font-semibold"
            disabled
          />
          <label
            htmlFor="country"
            className="absolute left-3 text-gray-500 pointer-events-none font-semibold top-0 text-xs"
          >
            Land
          </label>
          {/* Show CheckCircleIcon when all fields are valid */}
          {allFieldsValid() && (
            <CheckCircleIcon className="absolute right-3 top-2.5 h-6 w-6 text-green-500" />
          )}
        </div>
      </form>
    </div>
  );
};

export default CustomerDetails;
