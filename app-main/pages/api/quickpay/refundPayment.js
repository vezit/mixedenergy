// /pages/api/management/refundPayment.js

import { db } from '../../../lib/firebaseAdmin';
import axios from 'axios';

export default async function handler(req, res) {
  // Similar to capturePayment.js, but call the refund endpoint
  // https://api.quickpay.net/payments/{id}/refund
}
