import type { NextApiRequest } from 'next';

export function getCallerInfo(req: NextApiRequest) {
  // The 'x-forwarded-for' header is commonly set by proxies/load-balancers.
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const referer = req.headers['referer'] || req.headers['referrer'] || 'unknown';
  
  return {
    ip: Array.isArray(ip) ? ip[0] : ip,
    userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    referer: Array.isArray(referer) ? referer[0] : referer,
  };
}
