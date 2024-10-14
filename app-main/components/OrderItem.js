import { useState } from 'react';
import { format } from 'date-fns';
import Modal from './Modal';

export default function OrderItem({ order }) {
    const [expanded, setExpanded] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const toggleExpand = () => setExpanded(!expanded);
    
    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    const handleCapturePaymentAndSendEmail = async (orderId) => {
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
                await handleSendEmail(orderId); // Send email if payment was successful
            } else {
                alert(`Error capturing payment: ${data.message}`);
            }
        } catch (error) {
            console.error('Error capturing payment:', error);
            alert('Error capturing payment.');
        } finally {
            closeModal(); // Close the modal after attempting capture
        }
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

    return (
        <div className="border p-2 mb-2">
            <div className="flex justify-between items-center cursor-pointer" onClick={toggleExpand}>
                <div>
                    <p className="font-bold">Order ID: {order.id}</p>
                    <p>Customer: {order.customerDetails.fullName} - {order.customerDetails.email}</p>
                    <p>Date: {format(order.createdAt.toDate(), 'yyyy-MM-dd HH:mm:ss')}</p>
                </div>
                <div>
                    <button className="bg-gray-300 text-gray-700 px-2 py-1 rounded" onClick={toggleExpand}>
                        {expanded ? 'Collapse' : 'Expand'}
                    </button>
                </div>
            </div>
            {expanded && (
                <div className="mt-2">
                    <h3 className="font-bold">Order Details:</h3>
                    <ul className="list-disc pl-5">
                        {order.basketItems.map((item, index) => (
                            <li key={index}>{item.title} - Quantity: {item.quantity} - Price: {(item.price / 100).toFixed(2)} DKK</li>
                        ))}
                    </ul>
                    <p className="mt-2"><strong>Total Price:</strong> {(order.totalPrice / 100).toFixed(2)} DKK</p>

                    {/* Display the Payment ID if it exists */}
                    {order.paymentDetails?.id && (
                        <p className="mt-2"><strong>Payment ID:</strong> {order.paymentDetails.id}</p>
                    )}

                    <div className="flex space-x-2 mt-4">
                        <button
                            className={`px-4 py-2 rounded ${
                                order.status === 'captured'
                                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                                    : 'bg-green-500 text-white'
                            }`}
                            onClick={openModal}
                            disabled={order.status === 'captured'}
                        >
                            Capture Payment and Send Email
                        </button>
                    </div>
                </div>
            )}

            {/* Modal for Payment Confirmation */}
            <Modal isOpen={isModalOpen} onClose={closeModal} title="Confirm Payment Capture">
                <p>Are you sure you want to capture payment and send the email?</p>
                <div className="flex justify-center space-x-4 mt-4">
                    <button
                        className="bg-green-500 text-white px-4 py-2 rounded"
                        onClick={() => handleCapturePaymentAndSendEmail(order.id)}
                    >
                        Yes, Capture Payment
                    </button>
                    <button
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded"
                        onClick={closeModal}
                    >
                        Cancel
                    </button>
                </div>
            </Modal>
        </div>
    );
}
