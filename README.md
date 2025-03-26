# Mixed Energy – Custom Energy Drink E-commerce Platform

## Technology Stack

### Frontend
- **Framework:** Next.js (React + TypeScript)
- **Styling:** Tailwind CSS
- **Icons:** Heroicons

### Backend
- **Serverless Functions:** Node.js API routes via Next.js
- **Database:** Supabase (PostgreSQL)
- **Storage:** Firebase Admin SDK, Google Cloud Storage

### Deployment
- **Platform:** Vercel
- **CI/CD:** Automated deployment via Vercel

### APIs & Integrations
- **Payments:** QuickPay
- **Shipping:** PostNord
- **Address Validation:** Danish Address API (DAWA)
- **Maps:** Google Maps JavaScript API

### Tooling
- **HTTP Requests:** Axios
- **Date Management:** date-fns
- **Emails:** Nodemailer
- **PDF Generation:** PDFKit
- **Analytics:** Google Analytics
- **Animations:** canvas-confetti, fireworks-js

## Key Features

### Product Customization
- Allows users to create custom energy drink boxes, choosing box size and drink flavors.
- Includes a mystery box option for random drink selection based on themes or dietary preferences.

### Shopping Cart & Checkout
- Persistent shopping cart with real-time updates.
- Secure checkout process with QuickPay integration.
- Real-time address validation with DAWA.

### Order Processing
- Order confirmation via email with PDF invoices.
- Shipping and tracking integration with PostNord.

### Performance
- Optimized with server-side rendering and static generation (Next.js).
- Tailwind CSS purges unused styles for efficient loading.
- Code-splitting and dynamic imports to reduce load times.

## Security & Best Practices
- Secure backend integration with sensitive operations handled server-side.
- GDPR-compliant analytics implementation.
- Dual-layer validation and sanitization of inputs.
- Secure session management with cookies and optional Supabase Auth integration.
- Deployment security via Vercel with automatic HTTPS.

## Project Summary
Mixed Energy is a robust full-stack e-commerce platform built with Next.js, TypeScript, and Tailwind CSS. It features secure payment integration (QuickPay), dynamic shipping (PostNord), and advanced user interactions such as product customization and address validation (DAWA). Focused on security, compliance, and performance, it provides a seamless shopping experience tailored for custom energy drink packages.

---

© Victor Reipur
