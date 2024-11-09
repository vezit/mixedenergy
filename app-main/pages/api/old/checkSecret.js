import crypto from 'crypto';

const HASHED_SECRET_KEY = '16b97d3a16a583a8ad01c4d379e1b258ac2e90508082b0d78be7a1276e253b99';

export default function handler(req, res) {
  const localSecretKey = process.env.LOCALHOST_SECRET_KEY;

  if (!localSecretKey) {
    return res.status(400).json({ success: false, message: 'Secret key not found' });
  }

  const hash = crypto.createHash('sha256').update(localSecretKey).digest('hex');

  if (hash === HASHED_SECRET_KEY) {
    return res.status(200).json({ success: true });
  } else {
    return res.status(403).json({ success: false });
  }
}
