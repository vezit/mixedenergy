// /pages/api/management/sendInvoice.js

import { db } from '../../../lib/firebaseAdmin';
import { sendInvoiceEmail } from '../../../lib/email';
import { generateInvoicePDF } from '../../../lib/pdfGenerator';

export default async function handler(req, res) {
  const { orderId } = req.body;

  try {
    // Fetch order from Firestore
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const orderData = orderDoc.data();

    // Generate PDF invoice
    const pdfBuffer = await generateInvoicePDF(orderData);

    // Send email with PDF attachment
    const emailSent = await sendInvoiceEmail(orderData.customerDetails.email, orderData, pdfBuffer);

    if (emailSent) {
      // Update order to mark that invoice has been sent
      await orderRef.update({
        orderConfirmationSend: true,
        orderConfirmationSendAt: new Date(),
      });
      return res.status(200).json({ message: 'Email sent successfully' });
    } else {
      return res.status(500).json({ message: 'Error sending email' });
    }
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return res.status(500).json({ message: 'Error sending email' });
  }
}
