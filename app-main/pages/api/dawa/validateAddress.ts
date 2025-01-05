// pages/api/dawa/validateAddress.ts
import type { NextApiRequest, NextApiResponse } from 'next';

/** Interface for the request body */
interface ValidateAddressRequestBody {
  address: string;
}

/** Interface for DAWA API's response. Customize as needed. */
interface DawaResponse {
  resultater?: {
    kategori?: string;
    [key: string]: any;
  }[];
  [key: string]: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const { address } = req.body as ValidateAddressRequestBody;

  try {
    const response = await fetch(
      `https://api.dataforsyningen.dk/datavask/adresser?betegnelse=${encodeURIComponent(address)}`
    );

    const data = (await response.json()) as DawaResponse;

    // Check if the response contains a valid address
    if (
      data &&
      data.resultater &&
      data.resultater.length > 0 &&
      data.resultater[0].kategori === 'A' // Category 'A' indicates a precise match
    ) {
      res.status(200).json({ data: data.resultater[0] });
    } else {
      res.status(400).json({ error: 'Adresse ikke fundet eller ikke præcis.' });
    }
  } catch (error) {
    console.error('Error validating address with DAWA:', error);
    res.status(500).json({ error: 'Fejl ved validering af adresse' });
  }
}
