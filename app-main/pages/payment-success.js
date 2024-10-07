import { useRouter } from 'next/router';

export default function PaymentSuccess() {
    const router = useRouter();
    const { orderId } = router.query;

    return (
        <div>
            <h1>Payment Success</h1>
            <h2>Order ID: {orderId}</h2>
        </div>
    );
}