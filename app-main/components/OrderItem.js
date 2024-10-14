// /components/OrderItem.js

import { useState } from 'react';
import { format } from 'date-fns';

export default function OrderItem({ order }) {
    const [expanded, setExpanded] = useState(false);

    const toggleExpand = () => setExpanded(!expanded);


    const handleCapturePayment = async (orderId) => {
        try {
          const response = await fetch('/api/management/capturePayment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ orderId }),
          });
          const data = await response.json();
          if (response.ok) {
            alert('Payment captured successfully.');
          } else {
            alert(`Error capturing payment: ${data.message}`);
          }
        } catch (error) {
          console.error('Error capturing payment:', error);
          alert('Error capturing payment.');
        }
      };
      
      const handleCancelPayment = async (orderId) => {
        // Similar to handleCapturePayment
      };
      
      const handleRefundPayment = async (orderId) => {
        // Similar to handleCapturePayment
      };
      
      const handleSendEmail = async (orderId) => {
        try {
          const response = await fetch('/api/management/sendInvoice', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ orderId }),
          });
          const data = await response.json();
          if (response.ok) {
            alert('Email sent successfully.');
          } else {
            alert(`Error sending email: ${data.message}`);
          }
        } catch (error) {
          console.error('Error sending email:', error);
          alert('Error sending email.');
        }
      };
      
      const handleModifyOrder = (order) => {
        // Open a modal or navigate to a page to modify the order
      };

    return (
        <div className="border p-2 mb-2">
            <div
                className="flex justify-between items-center cursor-pointer"
                onClick={toggleExpand}
            >
                <div>
                    <p className="font-bold">Order ID: {order.id}</p>
                    <p>
                        Customer: {order.customerDetails.fullName} -{' '}
                        {order.customerDetails.email}
                    </p>
                    <p>
                        Date: {format(order.createdAt.toDate(), 'yyyy-MM-dd HH:mm:ss')}
                    </p>
                </div>
                <div>
                    <button
                        className="bg-gray-300 text-gray-700 px-2 py-1 rounded"
                        onClick={toggleExpand}
                    >
                        {expanded ? 'Collapse' : 'Expand'}
                    </button>
                </div>
            </div>
            {expanded && (
                <div className="mt-2">
                    {expanded && (
                        <div className="mt-2">
                            <h3 className="font-bold">Order Details:</h3>
                            <ul className="list-disc pl-5">
                                {order.basketItems.map((item, index) => (
                                    <li key={index}>
                                        {item.title} - Quantity: {item.quantity} - Price:{' '}
                                        {(item.price / 100).toFixed(2)} DKK
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-2">
                                <strong>Total Price:</strong> {(order.totalPrice / 100).toFixed(2)} DKK
                            </p>

                            <div className="flex space-x-2 mt-4">
                                <button
                                    className="bg-green-500 text-white px-4 py-2 rounded"
                                    onClick={() => handleCapturePayment(order.id)}
                                >
                                    Capture Payment
                                </button>
                                {/* <button
                                    className="bg-yellow-500 text-white px-4 py-2 rounded"
                                    onClick={() => handleCancelPayment(order.id)}
                                >
                                    Cancel Payment
                                </button> */}
                                {/* <button
                                    className="bg-red-500 text-white px-4 py-2 rounded"
                                    onClick={() => handleRefundPayment(order.id)}
                                >
                                    Refund Payment
                                </button> */}
                                <button
                                    className="bg-blue-500 text-white px-4 py-2 rounded"
                                    onClick={() => handleSendEmail(order.id)}
                                >
                                    Send Email with Invoice
                                </button>
                                <button
                                    className="bg-gray-500 text-white px-4 py-2 rounded"
                                    onClick={() => handleModifyOrder(order)}
                                >
                                    Modify Order
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
}
