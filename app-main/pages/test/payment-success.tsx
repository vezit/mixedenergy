// pages/test/payment-success.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function PaymentSuccess() {
  const [status, setStatus] = useState<'LOADING' | 'SUCCESS' | 'FAILED'>('LOADING');
  const router = useRouter();
  const { orderId } = router.query; // e.g., /payment-success?orderId=xyz

  useEffect(() => {
    // Only proceed if we actually have an orderId
    if (!orderId) return;

    // We'll fetch from an API route that checks QuickPay
    // For example: /api/quickpay/payment-status?orderId=xyz
    const verifyPayment = async () => {
      try {
        const res = await fetch(`/api/quickpay/payment-status?orderId=${orderId}`);
        if (!res.ok) throw new Error('Failed to verify payment');

        const data = await res.json();
        // Suppose data.accepted === true if QuickPay indicates success
        if (data.accepted) {
          setStatus('SUCCESS');
        } else {
          setStatus('FAILED');
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        setStatus('FAILED');
      }
    };

    verifyPayment();
  }, [orderId]);

  // Render different states
  if (status === 'LOADING') return <p>Tjekker betaling...</p>;
  if (status === 'FAILED') return <p>Betalingen mislykkedes. Prøv igen.</p>;

  // Default to success
  return <p>Betaling gennemført! Tak for din bestilling.</p>;
}
