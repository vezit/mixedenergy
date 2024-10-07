// pages/payment-success.js

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function PaymentSuccess() {
  const router = useRouter();
  const { orderId } = router.query;
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (orderId) {
      // Fetch the order document from Firestore
      const fetchOrderData = async () => {
        try {
          const response = await fetch(`/api/getOrder?orderId=${orderId}`);
          const data = await response.json();

          if (response.ok) {
            setOrderData(data);
          } else {
            setError(data.error || 'Failed to fetch order data');
          }
        } catch (err) {
          console.error('Error fetching order data:', err);
          setError('Failed to fetch order data');
        } finally {
          setLoading(false);
        }
      };

      fetchOrderData();
    }
  }, [orderId]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Payment Success</h1>
      <h2>Order ID: {orderId}</h2>
      <pre>{JSON.stringify(orderData, null, 2)}</pre>
    </div>
  );
}
