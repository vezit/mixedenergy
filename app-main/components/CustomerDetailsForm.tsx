import React, {
  useEffect,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { ICustomerDetails } from '../types/ICustomerDetails';

/** Valid keys of ICustomerDetails */
type CustomerDetailsKey = keyof ICustomerDetails;

/** Error messages keyed by field name. */
interface IErrors {
  [field: string]: string | null;
}

/** Which fields have been touched. */
interface ITouchedFields {
  [field: string]: boolean;
}

interface CustomerDetailsFormProps {
  /** The current details from context, so we can pre-fill */
  customerDetails: ICustomerDetails;

  /** 
   * This should update the DB (or Supabase) in the background.
   * We call this when a field is valid onBlur.
   */
  updateCustomerDetails: (details: Partial<ICustomerDetails>) => Promise<void>;

  /** If you still want to do something shipping-related, you have it here */
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
   * Local state for the visible input values as the user types.
   * We initialize each field with what's in `customerDetails` from context.
   */
  const [localDetails, setLocalDetails] = useState<ICustomerDetails>({
    customerType: customerDetails.customerType || '',
    streetNumber: customerDetails.streetNumber || '',
    fullName: customerDetails.fullName || '',
    mobileNumber: customerDetails.mobileNumber || '',
    email: customerDetails.email || '',
    address: customerDetails.address || '',
    postalCode: customerDetails.postalCode || '',
    city: customerDetails.city || '',
    country: customerDetails.country || 'Danmark',
  });
  
  /**
   * Keep localDetails in sync if parent/context changes
   * (e.g. if the form is reloaded with new data).
   */
  useEffect(() => {
    setLocalDetails((prev) => ({
      ...prev,
      ...customerDetails,
    }));
  }, [customerDetails]);

  /** Basic client-side validation for each field. */
  const validateField = (fieldName: CustomerDetailsKey, value: string | undefined) => {
    if (!value || !value.trim()) {
      return 'This field is required';
    }

    if (fieldName === 'mobileNumber') {
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

  /** Handle typing in each input (only updates local state). */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalDetails((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * When the user leaves the field:
   * - Mark it as touched
   * - Validate it
   * - If valid, call `updateCustomerDetails({ ... })` to save in DB
   */
  const handleInputBlur = async (fieldName: CustomerDetailsKey) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));

    const value = localDetails[fieldName];
    const errorMsg = validateField(fieldName, value);
    setErrors((prev) => ({ ...prev, [fieldName]: errorMsg }));

    // If no validation error, do the background save
    if (!errorMsg) {
      try {
        await updateCustomerDetails({ [fieldName]: value });
        // Optionally, if you want to update shipping data whenever the address changes:
        // if (fieldName === 'postalCode' || fieldName === 'address' || ...) {
        //   updateDeliveryDetailsInBackend('homeDelivery', {});
        // }
      } catch (error) {
        console.error('Error updating customer details in Supabase:', error);
      }
    }
  };

  /** Required fields for your final check. (Used if you do a final “Submit.”) */
  const requiredFields: CustomerDetailsKey[] = [
    'fullName',
    'mobileNumber',
    'email',
    'address',
    'postalCode',
    'city',
  ];

  /** Quick check for final "all valid" if needed. */
  const allFieldsValid = () => {
    const allFilled = requiredFields.every(
      (field) => localDetails[field] && localDetails[field]!.trim() !== ''
    );
    const noErrors = requiredFields.every((field) => !errors[field]);
    return allFilled && noErrors;
  };

  /** We can do an initial validation pass on mount if desired. */
  useEffect(() => {
    const newErrors: IErrors = { ...errors };
    requiredFields.forEach((field) => {
      const val = localDetails[field];
      const errorMsg = validateField(field, val);
      if (errorMsg) {
        newErrors[field] = errorMsg;
      }
    });
    setErrors(newErrors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Renders an icon for valid/invalid fields. */
  const renderIcon = (fieldName: CustomerDetailsKey) => {
    if (errors[fieldName]) {
      return (
        <ExclamationCircleIcon className="absolute right-3 top-2.5 h-6 w-6 text-red-600" />
      );
    } else if (localDetails[fieldName]) {
      return (
        <CheckCircleIcon className="absolute right-3 top-2.5 h-6 w-6 text-green-500" />
      );
    }
    return null;
  };

  return (
    <div id="customer-details">
      <h2 className="text-2xl font-bold mb-4">Kundeoplysninger</h2>
      <form onSubmit={(e) => e.preventDefault()}>
        {/* Full Name */}
        <div className="mb-9 relative">
          <input
            type="text"
            name="fullName"
            id="fullName"
            value={localDetails.fullName || ''}
            onChange={handleInputChange}
            onBlur={() => handleInputBlur('fullName')}
            className="peer w-full h-10 px-3 pt-4 pb-2 border rounded font-semibold focus:outline-none"
            placeholder=" "
          />
          <label
            htmlFor="fullName"
            className={`absolute left-3 text-gray-500 pointer-events-none font-semibold transition-all
              ${localDetails.fullName ? 'top-0 text-xs' : 'top-2 text-base'}
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
            value={localDetails.mobileNumber || ''}
            onChange={handleInputChange}
            onBlur={() => handleInputBlur('mobileNumber')}
            className="peer w-full h-10 px-3 pt-4 pb-2 border rounded font-semibold focus:outline-none"
            placeholder=" "
          />
          <label
            htmlFor="mobileNumber"
            className={`absolute left-3 text-gray-500 pointer-events-none font-semibold transition-all
              ${localDetails.mobileNumber ? 'top-0 text-xs' : 'top-2 text-base'}
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
            value={localDetails.email || ''}
            onChange={handleInputChange}
            onBlur={() => handleInputBlur('email')}
            className="peer w-full h-10 px-3 pt-4 pb-2 border rounded font-semibold focus:outline-none"
            placeholder=" "
          />
          <label
            htmlFor="email"
            className={`absolute left-3 text-gray-500 pointer-events-none font-semibold transition-all
              ${localDetails.email ? 'top-0 text-xs' : 'top-2 text-base'}
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
            value={localDetails.address || ''}
            onChange={handleInputChange}
            onBlur={() => handleInputBlur('address')}
            className="peer w-full h-10 px-3 pt-4 pb-2 border rounded font-semibold focus:outline-none"
            placeholder=" "
          />
          <label
            htmlFor="address"
            className={`absolute left-3 text-gray-500 pointer-events-none font-semibold transition-all
              ${localDetails.address ? 'top-0 text-xs' : 'top-2 text-base'}
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
            value={localDetails.postalCode || ''}
            onChange={handleInputChange}
            onBlur={() => handleInputBlur('postalCode')}
            className="peer w-full h-10 px-3 pt-4 pb-2 border rounded font-semibold focus:outline-none"
            placeholder=" "
          />
          <label
            htmlFor="postalCode"
            className={`absolute left-3 text-gray-500 pointer-events-none font-semibold transition-all
              ${localDetails.postalCode ? 'top-0 text-xs' : 'top-2 text-base'}
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
            value={localDetails.city || ''}
            onChange={handleInputChange}
            onBlur={() => handleInputBlur('city')}
            className="peer w-full h-10 px-3 pt-4 pb-2 border rounded font-semibold focus:outline-none"
            placeholder=" "
          />
          <label
            htmlFor="city"
            className={`absolute left-3 text-gray-500 pointer-events-none font-semibold transition-all
              ${localDetails.city ? 'top-0 text-xs' : 'top-2 text-base'}
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

        {/* Country (Read-Only) */}
        <div className="mb-9 relative">
          <input
            type="text"
            name="country"
            id="country"
            value={localDetails.country || 'Danmark'}
            onChange={() => {}}
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
