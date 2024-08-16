import '../styles/globals.css';
import { useState } from 'react';
import Header from '../components/Header';  // Import the Header component
import Footer from '../components/Footer';  // Import the Footer component
import Modal from '../components/Modal';   // Import the Modal component
import { useModal } from '../lib/modals';  // Import the useModal hook
import CookieConsent from '../components/CookieConsent';  // Import the CookieConsent component
import { BasketProvider } from '../lib/BasketContext'; // Import BasketProvider

function MyApp({ Component, pageProps }) {
  const { isModalOpen, closeModal } = useModal(true);

  return (
    <BasketProvider>
      <div className="flex flex-col min-h-screen">
        {/* Modal */}
        <Modal isOpen={isModalOpen} onClose={closeModal}>
          <p>This is the Handelsbetingelser page. The site is still under development.</p>
        </Modal>

        {/* Header */}
        <Header />

        {/* Main Content */}
        <main className="flex-grow flex flex-col items-center justify-center bg-gray-100">
          <Component {...pageProps} />
        </main>
        
        {/* Footer */}
        <Footer />

        {/* Cookie Consent */}
        <CookieConsent />
      </div>
    </BasketProvider>
  );
}

export default MyApp;
