// /lib/pdfGenerator.js

import PDFDocument from 'pdfkit';

export function generateInvoicePDF(orderData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header
      doc.fontSize(20).text('Invoice', { align: 'center' });
      doc.moveDown();

      // Customer Details
      doc.fontSize(12).text(`Order ID: ${orderData.orderId}`);
      doc.text(`Date: ${new Date().toLocaleDateString()}`);
      doc.text(`Customer Name: ${orderData.customerDetails.fullName}`);
      doc.text(`Email: ${orderData.customerDetails.email}`);
      doc.moveDown();

      // Table Header
      doc.text('Items:', { underline: true });
      doc.moveDown();

      // Table Rows
      orderData.basketItems.forEach((item) => {
        doc.text(
          `${item.title} - Quantity: ${item.quantity} - Price: ${(item.price / 100).toFixed(
            2
          )} DKK`
        );
      });

      doc.moveDown();
      doc.text(
        `Total Price: ${(orderData.totalPrice / 100).toFixed(2)} DKK`,
        { align: 'right' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
