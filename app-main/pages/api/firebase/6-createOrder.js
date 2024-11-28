// pages/api/firebase/6-createOrder.js

import { db } from '../../../lib/firebaseAdmin';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.warn(`Method ${req.method} not allowed on /api/firebase/createOrder`);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Get session ID from cookies
    const sessionId = req.cookies.sessionId;

    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID not found in cookies' });
    }

    // Get basket details from session in Firestore
    const sessionRef = db.collection('sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const sessionData = sessionDoc.data();
    const basketDetails = sessionData.basketDetails;

    if (!basketDetails || !basketDetails.items || basketDetails.items.length === 0) {
      return res.status(400).json({ message: 'Basket is empty' });
    }

    // Generate a new order ID
    const orderId = uuidv4();

    // Calculate total price securely on the server side
    const items = basketDetails.items;

    let totalPrice = 0;
    let totalRecyclingFee = 0;
    let deliveryFee = basketDetails.deliveryDetails?.deliveryFee || 0;

    items.forEach((item) => {
      totalPrice += item.totalPrice;
      totalRecyclingFee += item.totalRecyclingFee;
    });

    const totalAmount = totalPrice + totalRecyclingFee + deliveryFee; // Amount in cents

    // Create order data
    const orderData = {
      orderId: orderId,
      sessionId: sessionId,
      basketDetails: basketDetails,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      totalAmount: totalAmount, // Store total amount in the order
    };

    // Save the order to Firestore
    const orderRef = db.collection('orders').doc(orderId);
    await orderRef.set(orderData);

    // Create payment with QuickPay
    // Step 1: Create Payment
    const createPaymentResponse = await axios.post(
      'https://api.quickpay.net/payments',
      new URLSearchParams({
        currency: 'DKK',
        order_id: orderId,
      }),
      {
        headers: {
          'Accept-Version': 'v10',
          Authorization: `Basic ${Buffer.from(`:${process.env.QUICKPAY_API_KEY}`).toString(
            'base64'
          )}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const paymentData = createPaymentResponse.data;

    // Step 2: Create Payment Link
    const amount = totalAmount; // Amount in cents
    const paymentLinkResponse = await axios.put(
      `https://api.quickpay.net/payments/${paymentData.id}/link`,
      new URLSearchParams({
        amount: amount.toString(),
      }),
      {
        headers: {
          'Accept-Version': 'v10',
          Authorization: `Basic ${Buffer.from(`:${process.env.QUICKPAY_API_KEY}`).toString(
            'base64'
          )}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const paymentLinkData = paymentLinkResponse.data;

    // Update order with payment details
    await orderRef.update({
      paymentDetails: paymentData, // Store initial payment data
      paymentLink: paymentLinkData.url, // Store payment link
      updatedAt: new Date(),
    });

    // Return the payment link to the client
    res.status(200).json({ paymentLink: paymentLinkData.url });
  } catch (error) {
    console.error('Error in createOrder:', error.response?.data || error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
