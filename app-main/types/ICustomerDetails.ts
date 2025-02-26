// types/ICustomerDetails.ts

/**
 * If you don't actually need an index signature,
 * remove it for stricter typing.
 */
export interface ICustomerDetails {
  fullName: string;
  mobileNumber: string;
  email: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  customerType?: string;    // optional if you want
  streetNumber?: string;    // optional if you want
}

  