import { db } from '../../../lib/firebaseAdmin';
import axios from 'axios';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { orderId } = req.body;

    try {
        // Fetch order from Firestore
        const orderRef = db.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const orderData = orderDoc.data();
        const paymentDetails = orderData.paymentDetails;

        // Check if paymentDetails and id exist
        if (!paymentDetails || !paymentDetails.id) {
            return res.status(400).json({ message: 'Payment ID not found in order details' });
        }

        const paymentId = paymentDetails.id;
        const amount = orderData.totalPrice; // Adjust according to your Firestore structure

        // Capture Payment
        const response = await axios.post(
            `https://api.quickpay.net/payments/${paymentId}/capture`,
            new URLSearchParams({ amount: amount.toString() }), // Convert amount to string if necessary
            {
                headers: {
                    'Accept-Version': 'v10',
                    'Authorization': `Basic ${Buffer.from(`:${process.env.QUICKPAY_API_KEY}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                }
            }
        );

        // Handle pending capture
        if (response.status === 202 || (response.data && response.data.state === 'pending')) {
            console.warn('Capture request was accepted but not yet processed:', response.data);
            return res.status(202).json({ message: 'Payment capture is in progress' });
        }

        // If response is not ok or contains an error
        if (!response || response.status !== 200 || response.data.error) {
            throw new Error(`Error capturing payment: ${response.data.error?.message || 'Unknown error'}`);
        }

        // Update order status in Firestore on successful capture
        await orderRef.update({
            status: 'captured',
            'paymentDetails.state': 'captured',
            'paymentDetails.operations': [
                ...paymentDetails.operations,
                {
                    id: response.data.operations[1].id,
                    type: 'capture',
                    amount: amount,
                    pending: false,
                    qp_status_code: response.data.operations[1].qp_status_code,
                    qp_status_msg: response.data.operations[1].qp_status_msg,
                    created_at: new Date().toISOString(),
                    acquirer: response.data.acquirer
                }
            ],
            updatedAt: new Date(),
        });

        return res.status(200).json({ message: 'Payment captured successfully' });
    } catch (error) {
        console.error('Error capturing payment:', error.response?.data || error.message);
        return res.status(500).json({ message: 'Error capturing payment' });
    }
}
