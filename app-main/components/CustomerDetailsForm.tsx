import React, {
  useCallback,
  useEffect,
  Dispatch,
  SetStateAction,
} from 'react';
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { ICustomerDetails } from '../types/ICustomerDetails';

/** 
 * Define a union of valid field keys using `keyof ICustomerDetails`.
 * This ensures we only use valid property names like 'fullName', 'email', etc.
 */
type CustomerDetailsKey = keyof ICustomerDetails;

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
 *
 * @param customerDetails - The current customer details from your basket/session.
 * @param updateCustomerDetails - A function that updates the customer details in Supabase (via your BasketContext).
 * @param updateDeliveryDetailsInBackend - If you still want to trigger updates for e.g. homeDelivery, you can do so here.
 * @param errors, setErrors - For tracking validation errors.
 * @param touchedFields, setTouchedFields - Which fields have been interacted with.
 * @param submitAttempted - Whether the user has attempted submission (to show errors).
 */
interface CustomerDetailsFormProps {
  customerDetails: ICustomerDetails;
  updateCustomerDetails: (details: Partial<ICustomerDetails>) => Promise<void>;
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
   * (helps avoid excessive writes to the server).
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
   * 1) Push partial customer details to Supabase (via parent's `updateCustomerDetails`).
   *    Here, you can handle any server validation errors if `updateCustomerDetails` returns them.
   */
  const updateCustomerDetailsInSupabase = async (
    updatedDetails: Partial<ICustomerDetails>
  ): Promise<void> => {
    try {
      const response = await updateCustomerDetails(updatedDetails);
      // If your parent's update returns something like { success, errors },
      // you could handle those here:
      // if (!response?.success) {
      //   setErrors(response.errors || {});
      // }
    } catch (error) {
      console.error('Error updating customer details in Supabase:', error);
    }
  };

  /** Debounce so we don't spam the server on every keystroke. */
  const debouncedUpdate = useCallback(
    debounce(updateCustomerDetailsInSupabase, 800),
    []
  );

  /** Basic client-side validation for required fields. */
  const validateField = (fieldName: CustomerDetailsKey, value: string | undefined) => {
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
    // Cast name to a valid customer-details key:
    const fieldName = name as CustomerDetailsKey;

    // Immediately update local state in the parent
    // (BasketContext) so the UI is responsive.
    updateCustomerDetails({ [fieldName]: value });

    // Validate the field
    const errorMsg = validateField(fieldName, value);
    setErrors((prev) => ({ ...prev, [fieldName]: errorMsg }));

    // Debounced push to Supabase
    debouncedUpdate({ [fieldName]: value });
  };

  /** Called when an input loses focus. */
  const handleInputBlur = (fieldName: CustomerDetailsKey) => {
    // Mark field as touched
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));

    const value = customerDetails[fieldName];
    const errorMsg = validateField(fieldName, value);
    setErrors((prev) => ({ ...prev, [fieldName]: errorMsg }));

    // No direct calls to updateDeliveryDetailsInBackend here
  };

  /** Check if all required fields are valid. */
  const requiredFields: CustomerDetailsKey[] = [
    'fullName',
    'mobileNumber',
    'email',
    'address',
    'postalCode',
    'city',
  ];

  const allFieldsValid = () => {
    // 1) Every required field is filled
    const allFilled = requiredFields.every(
      (field) =>
        customerDetails[field] && customerDetails[field]!.trim() !== ''
    );
    // 2) None of those fields have errors
    const noErrors = requiredFields.every((field) => !errors[field]);
    return allFilled && noErrors;
  };

  /** Validate once on mount. */
  useEffect(() => {
    const newErrors: IErrors = { ...errors };

    requiredFields.forEach((field) => {
      const value = customerDetails[field];
      const errorMsg = validateField(field, value);
      if (errorMsg) {
        newErrors[field] = errorMsg;
      }
    });
    setErrors(newErrors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Trigger updateDeliveryDetailsInBackend ONLY when
   * all required fields are valid.
   */
  useEffect(() => {
    if (allFieldsValid()) {
      // updateDeliveryDetailsInBackend('homeDelivery', {});
    }
  }, [customerDetails, errors, updateDeliveryDetailsInBackend]);

  /** Renders an icon for valid/invalid fields. */
  const renderIcon = (fieldName: CustomerDetailsKey) => {
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
