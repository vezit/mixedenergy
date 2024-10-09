// pages/api/getOrder.js

import { db } from '../../lib/firebaseAdmin';

export default async function handler(req, res) {
  const { orderId } = req.query;

  try {
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.status(200).json(orderDoc.data());
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
