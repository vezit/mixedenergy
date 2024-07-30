// pages/api/payment.js
import axios from 'axios';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).end(); // Method Not Allowed
    }

    const { amount, currency, order_id } = req.body;
    const apiKey = process.env.QUICKPAY_API_KEY;

    try {
        // Step 1: Create Payment
        const paymentResponse = await axios.post('https://api.quickpay.net/payments', {
            order_id,
            currency,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept-Version': 'v10',
                'Authorization': `Basic ${Buffer.from(`:${apiKey}`).toString('base64')}`,
            },
        });

        const payment = paymentResponse.data;

        // Step 2: Create Payment Link
        const linkResponse = await axios.put(`https://api.quickpay.net/payments/${payment.id}/link`, {
            amount,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept-Version': 'v10',
                'Authorization': `Basic ${Buffer.from(`:${apiKey}`).toString('base64')}`,
            },
        });

        const paymentLink = linkResponse.data.url;

        res.status(200).json({ paymentLink });
    } catch (error) {
        console.error('Payment creation error:', error);
        res.status(500).json({ error: 'Payment creation failed' });
    }
}
