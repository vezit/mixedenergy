// pages/payment.js
import { useState } from 'react';

export default function PaymentPage() {
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [orderId, setOrderId] = useState('');
    const [paymentLink, setPaymentLink] = useState('');

    const handlePayment = async (e) => {
        e.preventDefault();

        const res = await fetch('/api/payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: parseInt(amount) * 100, // Convert to cents
                currency,
                order_id: orderId,
            }),
        });

        const data = await res.json();
        if (res.status === 200) {
            setPaymentLink(data.paymentLink);
        } else {
            console.error('Payment creation failed', data);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Make a Payment</h1>
            <form onSubmit={handlePayment} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Amount</label>
                    <input
                        type="text"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="mt-1 p-2 block w-full border rounded-md"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Currency</label>
                    <input
                        type="text"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="mt-1 p-2 block w-full border rounded-md"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Order ID</label>
                    <input
                        type="text"
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                        className="mt-1 p-2 block w-full border rounded-md"
                    />
                </div>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md">Pay</button>
            </form>
            {paymentLink && (
                <div className="mt-4">
                    <a href={paymentLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                        Complete Payment
                    </a>
                </div>
            )}
        </div>
    );
}
