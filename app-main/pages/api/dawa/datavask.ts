// /pages/api/dawa/datavask.ts

import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Interface representing the expected fields from the request body.
 */
interface DatavaskRequestBody {
  address: string;
  city: string;
  country?: string;
  customerType?: string;
  email?: string;
  fullName?: string;
  mobileNumber?: string;
  postalCode: string;
  streetNumber?: string;
}

/**
 * Interface for DAWA API's response structure. 
 * Adjust based on the actual data you receive from DAWA.
 */
interface DawaResponse {
  resultater?: any[];
  [key: string]: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests are allowed' });
  }

  const {
    address,
    city,
    country,
    customerType,
    email,
    fullName,
    mobileNumber,
    postalCode,
    streetNumber,
  } = req.body as DatavaskRequestBody;

  if (!address || !city || !postalCode) {
    return res
      .status(400)
      .json({ message: 'Address, city, and postalCode are required fields.' });
  }

  try {
    // Prepare the query parameter
    const fullAddress = `${address} ${streetNumber}, ${postalCode} ${city}`;
    const query = encodeURIComponent(fullAddress);

    // Make the request to the DAWA API
    const dawaResponse = await fetch(
      `https://api.dataforsyningen.dk/datavask/adresser?betegnelse=${query}`
    );

    const data = (await dawaResponse.json()) as DawaResponse;

    if (!dawaResponse.ok || !data.resultater || data.resultater.length === 0) {
      return res
        .status(400)
        .json({ message: 'Address validation failed.', data });
    }

    // Send the response back to the client
    return res.status(200).json({
      customerDetails: {
        address,
        city,
        country,
        customerType,
        email,
        fullName,
        mobileNumber,
        postalCode,
        streetNumber,
      },
      dawaResponse: data,
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
