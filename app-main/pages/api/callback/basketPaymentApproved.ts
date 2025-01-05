// pages/api/quickpayCallback.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import getRawBody from 'raw-body';
import { db } from '../../../lib/firebaseAdmin';
import { sendOrderConfirmation } from '../../../lib/email';

// If you're on Next.js 12 or below, you can keep the bodyParser config here
// For newer Next.js versions, this config still works to disable body parsing.
export const config = {
  api: {
    bodyParser: false, // Disable automatic body parsing
  },
};

/** 
 * Minimal interface for QuickPay operations. 
 * You can refine these fields based on the actual QuickPay payload you receive.
 */
interface QuickPayOperation {
  id: string;
  type: string;
  amount: number;
  aq_status_msg: string;
}

/**
 * Minimal interface for QuickPay payment data. 
 * Add or remove fields to match your QuickPay payload.
 */
interface QuickPayPayment {
  order_id: string;
  operations: QuickPayOperation[];
  accepted: boolean;
  [key: string]: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const apiKey = process.env.QUICKPAY_API_KEY || '';
  const checksumHeader = req.headers['quickpay-checksum-sha256'] as string | undefined;

  try {
    // Get the raw body as a Buffer
    const rawBody = await getRawBody(req);

    // Compute the checksum on the raw body
    const computedChecksum = crypto
      .createHmac('sha256', apiKey)
      .update(rawBody)
      .digest('hex');

    console.log('Received checksum:', checksumHeader);
    console.log('Computed checksum:', computedChecksum);

    // Uncomment this block to strictly validate the checksum
    // if (checksumHeader !== computedChecksum) {
    //   console.error('Invalid QuickPay signature');
    //   return res.status(403).json({ message: 'Invalid signature' });
    // }

    // Parse the raw body into a JSON object
    const payment = JSON.parse(rawBody.toString('utf8')) as QuickPayPayment;
    const orderId = payment.order_id;

    // Retrieve the order document from Firestore
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      console.error(`Order ${orderId} does not exist`);
      return res.status(404).json({ message: 'Order not found' });
    }

    const orderData = orderDoc.data() || {};

    // Construct updated order data
    const updatedOrderData = {
      ...orderData,
      quickpayPaymentDetails: {
        operations: payment.operations.map(({ id, type, amount, aq_status_msg }) => ({
          id,
          type,
          amount,
          aq_status_msg,
        })),
        status: payment.accepted ? 'paid' : 'failed',
      },
      updatedAt: new Date(),
      orderConfirmationSend: false,
      orderConfirmationSendAt: null,
    };

    // If payment is accepted, attempt sending order confirmation
    if (payment.accepted) {
      try {
        const emailSent = await sendOrderConfirmation(
          orderData.customerDetails?.email,
          updatedOrderData
        );
        if (emailSent) {
          updatedOrderData.orderConfirmationSend = true;
          updatedOrderData.orderConfirmationSendAt = new Date();
        }
      } catch (emailError) {
        console.error('Error sending order confirmation email:', emailError);
      }
    }

    // Update Firestore with the final order data
    await orderRef.set(updatedOrderData);

    return res.status(200).json({ message: 'Order updated successfully' });
  } catch (error) {
    console.error('Error processing callback:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
