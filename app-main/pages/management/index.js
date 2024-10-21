// /pages/management/index.js

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, orderBy, limit, startAfter } from 'firebase/firestore';
import { useRouter } from 'next/router';
import { firebaseApp } from '../../lib/firebase';
import OrderItem from '../../components/OrderItem';
import Loading from '/components/Loading';

export default function ManagementPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [firstDoc, setFirstDoc] = useState(null);
  const [page, setPage] = useState(1);

  const router = useRouter();
  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/management/login');
      } else if (user.email !== 'management@mixedenergy.dk') {
        router.push('/');
      } else {
        setLoading(false); // User is authenticated and is admin
      }
    });

    return () => unsubscribe();
  }, [auth, router]);

  useEffect(() => {
    if (!loading) {
      fetchOrders();
    }
  }, [loading]);

  const fetchOrders = async (direction = 'next') => {
    try {
      const ordersRef = collection(db, 'orders');
      let q;

      if (direction === 'next') {
        if (lastDoc) {
          q = query(ordersRef, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(10));
        } else {
          q = query(ordersRef, orderBy('createdAt', 'desc'), limit(10));
        }
      } else {
        // For simplicity, we'll reload the first page when going back
        q = query(ordersRef, orderBy('createdAt', 'desc'), limit(10));
        setPage(1);
      }

      const querySnapshot = await getDocs(q);
      const ordersData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setOrders(ordersData);

      if (ordersData.length > 0) {
        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setFirstDoc(querySnapshot.docs[0]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  // Inside ManagementPage component

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Order Management</h1>
      {loading ? (
        <Loading />
      ) : (
        <>
          {orders.map((order) => (
            <OrderItem key={order.id} order={order} />
          ))}
          <div className="flex justify-between mt-4">
            <button
              onClick={() => fetchOrders('prev')}
              disabled={page === 1}
              className="bg-gray-500 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => {
                setPage(page + 1);
                fetchOrders('next');
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );

}
