// lib/email.js

import nodemailer from 'nodemailer';

export async function sendOrderConfirmation(email, orderData) {
  // Create a transporter using your SMTP settings
  const transporter = nodemailer.createTransport({
    host: 'asmtp.dandomain.dk',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'info@mixedenergy.dk',
      pass: process.env.SMTP_PASSWORD, // Set this in your environment variables
    },
    tls: {
      ciphers: 'SSLv3',
    },
  });

  // Prepare email content
  const mailOptions = {
    from: '"Mixed Energy" <info@mixedenergy.dk>',
    to: email,
    subject: 'Ordrebekræftelse fra Mixed Energy',
    text: generateEmailText(orderData), // Implement this function to generate plain text
    html: generateEmailHTML(orderData), // Implement this function to generate HTML content
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent:', info.messageId);
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
  }
}

// Helper function to generate plain text email content
function generateEmailText(orderData) {
  let itemsText = orderData.basketItems
    .map(
      (item) =>
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

// Helper function to generate HTML email content
function generateEmailHTML(orderData) {
  let itemsHTML = orderData.basketItems
    .map(
      (item) =>
        `<li>${item.title} - Antal: ${item.quantity} - Pris: ${(item.price / 100).toFixed(
          2
        )} kr</li>`
    )
    .join('');

  return `
  <p>Hej ${orderData.customerDetails.fullName},</p>
  <p>Tak for din ordre hos Mixed Energy!</p>
  <p><strong>Ordre ID:</strong> ${orderData.orderId}</p>
  <p><strong>Dine bestilte varer:</strong></p>
  <ul>${itemsHTML}</ul>
  <p><strong>Total pris:</strong> ${(orderData.basketItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  ) / 100).toFixed(2)} kr</p>
  <p>Vi giver besked, når din ordre er på vej.</p>
  <p>Med venlig hilsen,<br/>Mixed Energy</p>
  `;
}
