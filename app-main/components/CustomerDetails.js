// components/CustomerDetails.js

import React from 'react';
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

const CustomerDetails = ({
  customerDetails,
  handleInputChange,
  handleInputBlur,
  touchedFields,
  errors,
  allFieldsValid,
}) => {
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
            className={`peer w-full px-3 pt-2 pb-2 border rounded font-semibold focus:outline-none`}
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
