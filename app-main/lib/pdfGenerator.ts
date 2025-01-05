import PDFDocument from 'pdfkit';

/**
 * Represents an item in the basket.
 */
interface BasketItem {
  title: string;
  quantity: number;
  price: number; // Price in cents
}

/**
 * Represents customer details.
 */
interface CustomerDetails {
  fullName: string;
  email: string;
}

/**
 * Represents the full order data used for generating the PDF.
 */
interface OrderData {
  orderId: string;
  customerDetails: CustomerDetails;
  basketItems: BasketItem[];
  totalPrice: number; // Total in cents
}

/**
 * Generates an invoice PDF as a Buffer.
 * @param orderData - The data for the order to be included in the invoice.
 * @returns A Promise resolving to a Buffer containing the generated PDF.
 */
export function generateInvoicePDF(orderData: OrderData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
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
