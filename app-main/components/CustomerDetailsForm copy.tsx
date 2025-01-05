import React, { useCallback, useEffect, Dispatch, SetStateAction } from 'react';
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { ICustomerDetails } from '../types/ICustomerDetails';

/**
 * 1) **ICustomerDetails** includes an index signature to allow flexible property access.
 * 2) The 'customerType' or other fields are optional to avoid stricter errors.
 */


/** Error messages keyed by field name. */
interface IErrors {
  [field: string]: string | null;
}

/** Which fields have been touched. */
interface ITouchedFields {
  [field: string]: boolean;
}

/**
 * Props for your customer details form.
 * Note the function signature for `updateCustomerDetails` → `(details: Partial<ICustomerDetails>) => void`
 */
interface CustomerDetailsFormProps {
  customerDetails: ICustomerDetails;
  updateCustomerDetails: (details: Partial<ICustomerDetails>) => void;
  updateDeliveryDetailsInBackend: (option: string, data?: Record<string, any>) => void;

  errors: IErrors;
  setErrors: Dispatch<SetStateAction<IErrors>>;
  touchedFields: ITouchedFields;
  setTouchedFields: Dispatch<SetStateAction<ITouchedFields>>;

  submitAttempted: boolean;
}

const CustomerDetailsForm: React.FC<CustomerDetailsFormProps> = ({
  customerDetails,
  updateCustomerDetails,
  updateDeliveryDetailsInBackend,
  errors,
  setErrors,
  touchedFields,
  setTouchedFields,
  submitAttempted,
}) => {
  /**
   * A simple debounce utility to delay updates 
   * (helps avoid excessive writes to Firebase).
   */
  const debounce = (func: (...args: any[]) => void, delay: number) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  /**
   * Push partial customer details to the backend (Firebase).
   */
  const updateCustomerDetailsInFirebase = async (
    updatedDetails: Partial<ICustomerDetails>
  ): Promise<void> => {
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
        setErrors(data.errors || {});
        throw new Error(data.error || 'Error updating customer details');
      }
    } catch (error) {
      console.error('Error updating customer details in Firebase:', error);
    }
  };

  const debouncedUpdate = useCallback(
    debounce(updateCustomerDetailsInFirebase, 800),
    []
  );

  /** Basic client-side validation for required fields. */
  const validateField = (fieldName: string, value: string | undefined) => {
    if (!value || !value.trim()) {
      return 'This field is required';
    }
    if (fieldName === 'mobileNumber') {
      // e.g. 8-digit mobile number
      const mobileNumberRegex = /^\d{8}$/;
      if (!mobileNumberRegex.test(value.trim())) {
        return 'Please enter a valid 8-digit mobile number';
      }
    } else if (fieldName === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.trim())) {
        return 'Please enter a valid email address';
      }
    } else if (fieldName === 'postalCode') {
      const postalCodeRegex = /^\d{4}$/;
      if (!postalCodeRegex.test(value.trim())) {
        return 'Please enter a valid 4-digit postal code';
      }
    }
    return null;
  };

  /** Called on every input change. */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Merge the updated field into existing customerDetails
    const updatedDetails: ICustomerDetails = {
      ...customerDetails,
      [name]: value,
    };

    // Update local (or global) state with partial details
    updateCustomerDetails(updatedDetails);

    // Validate the field
    const errorMsg = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: errorMsg }));

    // Debounced push to backend
    debouncedUpdate({ [name]: value });
  };

  const handleInputBlur = (fieldName: string) => {
    // Mark field as touched
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));

    const value = customerDetails[fieldName];
    const errorMsg = validateField(fieldName, value);
    setErrors((prev) => ({ ...prev, [fieldName]: errorMsg }));

    // Example: if relevant to home delivery, update backend
    if (['address', 'postalCode', 'city'].includes(fieldName)) {
      updateDeliveryDetailsInBackend('homeDelivery', {});
    }
  };

  /** Check if all required fields are valid. */
  const allFieldsValid = () => {
    const requiredFields = ['fullName', 'mobileNumber', 'email', 'address', 'postalCode', 'city'];
    return requiredFields.every(
      (field) =>
        !errors[field] &&
        customerDetails[field] &&
        customerDetails[field]!.trim()
    );
  };

  /** Validate once on mount. */
  useEffect(() => {
    const fieldsToValidate = ['fullName', 'mobileNumber', 'email', 'address', 'postalCode', 'city'];
    const newErrors: IErrors = { ...errors };

    fieldsToValidate.forEach((field) => {
      const value = customerDetails[field];
      const errorMsg = validateField(field, value);
      if (errorMsg) {
        newErrors[field] = errorMsg;
      }
    });
    setErrors(newErrors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Renders an icon for valid/invalid fields. */
  const renderIcon = (fieldName: string) => {
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
            className="peer w-full h-10 px-3 pt-4 pb-2 border rounded font-semibold focus:outline-none"
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
            className="peer w-full h-10 px-3 pt-4 pb-2 border rounded font-semibold focus:outline-none"
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
            className="peer w-full h-10 px-3 pt-4 pb-2 border rounded font-semibold focus:outline-none"
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
            className="peer w-full h-10 px-3 pt-4 pb-2 border rounded font-semibold focus:outline-none"
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
            value={customerDetails.country || 'Danmark'}
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
          {allFieldsValid() && (
            <CheckCircleIcon className="absolute right-3 top-2.5 h-6 w-6 text-green-500" />
          )}
        </div>
      </form>
    </div>
  );
};

export default CustomerDetailsForm;
