// pages/payment-success.tsx

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
// Adjust the import path below to match your project structure
import Loading from '../components/Loading'; 

interface IOrderData {
  // Define the shape of the order data you expect
  // For example:
  // orderId: string;
  // amount: number;
  // items: Array<{ name: string; quantity: number }>;
  // etc.
  [key: string]: any; // fallback if structure is unknown
}

const PaymentSuccess: React.FC = () => {
  const router = useRouter();
  const { orderId } = router.query;

  const [orderData, setOrderData] = useState<IOrderData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
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

  if (loading) return <Loading />;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Payment Success</h1>
      <h2>Order ID: {orderId}</h2>
      {orderData && (
        <pre>{JSON.stringify(orderData, null, 2)}</pre>
      )}
    </div>
  );
};

export default PaymentSuccess;
