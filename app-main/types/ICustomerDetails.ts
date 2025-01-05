// types/ICustomerDetails.ts

/**
 * If you don't actually need an index signature,
 * remove it for stricter typing.
 */
export interface ICustomerDetails {
    customerType: string;
    fullName: string;
    mobileNumber: string;
    email: string;
    address: string;
    streetNumber: string;
    postalCode: string;
    city: string;
    country: string;
  }
  