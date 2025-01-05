// /pages/api/checkAuth.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import cookie from 'cookie';
import { admin } from '../../../lib/firebaseAdmin'; // Adjust path as needed

interface DecodedClaims {
  email?: string;
  [key: string]: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  try {
    // Parse cookies from the request headers
    const cookies = cookie.parse(req.headers.cookie || '');
    // Retrieve the session cookie
    const sessionCookie = cookies.session || '';

    // Verify the session cookie
    const decodedClaims: DecodedClaims = await admin
      .auth()
      .verifySessionCookie(sessionCookie, true);

    // If successful, return the user's email and loggedIn status
    return res.status(200).json({
      loggedIn: true,
      email: decodedClaims.email,
    });
  } catch (error) {
    // If verification fails, return not logged in status
    return res.status(200).json({
      loggedIn: false,
    });
  }
}
