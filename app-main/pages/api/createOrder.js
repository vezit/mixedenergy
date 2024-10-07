// pages/api/createOrder.js

import { db } from '../../lib/firebaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { basketItems, customerDetails } = req.body;

  // Generate a unique order ID
  const orderId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // Create a new order document
  const orderData = {
    orderId,
    basketItems,
    customerDetails,
    status: 'pending',
    createdAt: new Date(),
  };

  try {
    await db.collection('orders').doc(orderId).set(orderData);
    res.status(200).json({ orderId });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
