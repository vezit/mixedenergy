// api/supabase/0-checkAuth.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import cookie from 'cookie';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  try {
    // Parse cookies from the request headers
    const cookies = cookie.parse(req.headers.cookie || '');
    // Retrieve the Supabase JWT (access token) from the "session" cookie
    const supabaseToken = cookies.session || '';

    if (!supabaseToken) {
      // No token means the user isn't logged in
      return res.status(200).json({ loggedIn: false });
    }

    // Attempt to verify the token by retrieving the user
    // In Supabase v2.x, this is:
    const { data: userData, error } = await supabaseAdmin.auth.getUser(supabaseToken);

    if (error || !userData?.user) {
      // Verification failed or user is null
      return res.status(200).json({ loggedIn: false });
    }

    // If successful, return user's email and loggedIn status
    return res.status(200).json({
      loggedIn: true,
      email: userData.user.email, // or any other user fields
    });
  } catch (error) {
    // If anything goes wrong, treat it as "not logged in"
    return res.status(200).json({ loggedIn: false });
  }
}
