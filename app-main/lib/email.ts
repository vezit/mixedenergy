// lib/email.js

import nodemailer from 'nodemailer';

interface BasketItem {
  title: string;
  quantity: number;
  price: number;
}

interface CustomerDetails {
  fullName: string;
}

interface OrderData {
  orderId: string;
  basketItems: BasketItem[];
  customerDetails: CustomerDetails;
}

// Helper functions to generate email content
function generateEmailText(orderData: OrderData): string {
  const itemsText = orderData.basketItems
    .map((item) => 
      `${item.title} - Antal: ${item.quantity} - Pris: ${(item.price / 100).toFixed(2)} kr`
    )
    .join('\n');

  return `
Hej ${orderData.customerDetails.fullName},

Tak for din ordre hos Mixed Energy!

Ordre ID: ${orderData.orderId}

Dine bestilte varer:
${itemsText}

Total pris: ${(orderData.basketItems.reduce((total, item) => total + item.price * item.quantity, 0) / 100).toFixed(2)} kr

Vi giver besked, når din ordre er på vej.

Med venlig hilsen,
Mixed Energy
`;
}

function generateEmailHTML(orderData: OrderData): string {
  const itemsHTML = orderData.basketItems
    .map((item) => 
      `<li>${item.title} - Antal: ${item.quantity} - Pris: ${(item.price / 100).toFixed(2)} kr</li>`
    )
    .join('');

  const totalPrice = (orderData.basketItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  ) / 100).toFixed(2);

  return `
  <p>Hej ${orderData.customerDetails.fullName},</p>
  <p>Tak for din ordre hos Mixed Energy!</p>
  <p><strong>Ordre ID:</strong> ${orderData.orderId}</p>
  <p><strong>Dine bestilte varer:</strong></p>
  <ul>${itemsHTML}</ul>
  <p><strong>Total pris:</strong> ${totalPrice} kr</p>
  <p>Vi giver besked, når din ordre er på vej.</p>
  <p>Med venlig hilsen,<br/>Mixed Energy</p>
  `;
}

export async function sendInvoiceEmail(
  email: string,
  orderData: OrderData,
  pdfBuffer: Buffer
): Promise<boolean> {
  const transporter = nodemailer.createTransport({
    host: 'asmtp.dandomain.dk',
    port: 587,
    secure: false,
    auth: {
      user: 'info@mixedenergy.dk',
      pass: process.env.SMTP_PASSWORD!,
    },
    tls: {
      ciphers: 'SSLv3',
    },
  });

  const mailOptions = {
    from: '"Mixed Energy" <info@mixedenergy.dk>',
    to: email,
    subject: 'Din faktura fra Mixed Energy',
    text: generateEmailText(orderData),
    html: generateEmailHTML(orderData),
    attachments: [
      {
        filename: 'Faktura.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Invoice email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return false;
  }
}

export async function sendOrderConfirmation(
  email: string,
  orderData: OrderData
): Promise<boolean> {
  const transporter = nodemailer.createTransport({
    host: 'asmtp.dandomain.dk',
    port: 587,
    secure: false,
    auth: {
      user: 'info@mixedenergy.dk',
      pass: process.env.SMTP_PASSWORD!,
    },
    tls: {
      ciphers: 'SSLv3',
    },
  });

  const mailOptions = {
    from: '"Mixed Energy" <info@mixedenergy.dk>',
    to: email,
    subject: 'Ordrebekræftelse fra Mixed Energy',
    text: generateEmailText(orderData),
    html: generateEmailHTML(orderData),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return false;
  }
}
