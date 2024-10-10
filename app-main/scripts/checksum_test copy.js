// checksum_test.js

import crypto from 'crypto';

const apiKey = '8154521c4a491c9eaf295b096c8cd308e7a8c293e3721aceb89c2c750055fe5f';

let rawBodyString = '{"id":492090544,"ulid":"01J9VQEEWNJ0DZ57GBCJH47W81","merchant_id":189709,"order_id":"uN37ViQ7314bnUojnh3i","accepted":true,"type":"Payment","text_on_statement":"Mixedenergy sales","branding_id":null,"variables":{},"currency":"DKK","state":"new","metadata":{"type":"card","origin":"form","brand":"visa","bin":"100000","corporate":false,"last4":"0008","exp_month":12,"exp_year":2025,"country":"SLV","is_3d_secure":false,"3d_secure_type":null,"issued_to":"Christian Jensen","hash":"ecaa5c53e909cdeb61489uPztpGAYEtpWusyacmj95BRrDyuQoBG","moto":false,"number":null,"customer_ip":"2.106.184.230","customer_country":"DK","fraud_suspected":false,"fraud_remarks":[],"fraud_reported":false,"fraud_report_description":null,"fraud_reported_at":null,"nin_number":null,"nin_country_code":null,"nin_gender":null,"shopsystem_name":null,"shopsystem_version":null,"ch_mid":null},"link":{"url":"https://payment.quickpay.net/payments/6e1d48cb94bca02c64e14ef16565d1a591c63bd2ac1e0b77819b60ba81d513e1","agreement_id":882476,"language":"da","amount":17520,"continue_url":"https://www.mixedenergy.dk/payment-success?orderId=uN37ViQ7314bnUojnh3i","cancel_url":"https://www.mixedenergy.dk/basket","callback_url":"https://www.mixedenergy.dk/api/quickpayCallback","payment_methods":null,"auto_fee":false,"auto_capture":null,"auto_capture_at":null,"branding_id":null,"google_analytics_client_id":null,"google_analytics_tracking_id":null,"version":"v10","acquirer":null,"deadline":null,"framed":false,"branding_config":{},"invoice_address_selection":null,"shipping_address_selection":null,"fee_vat":null,"moto":false,"customer_email":null},"shipping_address":null,"invoice_address":null,"basket":[],"shipping":null,"operations":[{"id":1,"type":"authorize","amount":17520,"pending":false,"qp_status_code":"20000","qp_status_msg":"Approved","aq_status_code":"20000","aq_status_msg":"Approved","data":{},"callback_url":"https://www.mixedenergy.dk/api/quickpayCallback","callback_success":null,"callback_response_code":null,"callback_duration":null,"acquirer":"clearhaus","3d_secure_status":null,"callback_at":null,"created_at":"2024-10-10T17:26:06Z"}],"test_mode":true,"acquirer":"clearhaus","facilitator":null,"created_at":"2024-10-10T17:25:55Z","updated_at":"2024-10-10T17:26:06Z","retented_at":null,"balance":0,"fee":null,"deadline_at":null,"reseller_id":2}';

// Convert the rawBodyString to a Buffer
const rawBodyBuffer = Buffer.from(rawBodyString, 'utf-8');

// Optional: Log the hex representation of the raw body
console.log('Raw Body Hex:', rawBodyBuffer.toString('hex'));

// Compute the checksum
const computedChecksum = crypto
  .createHmac('sha256', apiKey)
  .update(rawBodyBuffer)
  .digest('hex');

console.log('Computed Checksum:', computedChecksum);
