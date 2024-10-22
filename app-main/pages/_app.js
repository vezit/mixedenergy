// pages/_app.js

import '../styles/globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useModal } from '../lib/modals';
import CookieConsent from '../components/CookieConsent';
import { BasketProvider } from '../components/BasketContext';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import * as gtag from '../lib/gtag';
import { getCookie } from '../lib/cookies';
import axios from 'axios';
import AddToBasketPopup from '../components/AddToBasketPopup';

function MyApp({ Component, pageProps }) {
  const { isModalOpen, closeModal } = useModal(true);
  const router = useRouter();

  // Track page views when the route changes
  useEffect(() => {
    const handleRouteChange = (url) => {
      gtag.pageview(url); // Send pageview event to Google Analytics
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  // // Check for session cookie and initialize session via API
  // useEffect(() => {
  //   // Ensure session exists via API
  //   axios
  //     .get('/api/getSession')
  //     .catch((error) => {
  //       if (error.response && error.response.status === 404) {
  //         // Session does not exist, create it
  //         axios.post('/api/createSession').catch((err) => {
  //           console.error('Error creating session:', err);
  //         });
  //       } else {
  //         console.error('Error checking session:', error);
  //       }
  //     });
  // }, []);


  return (
    <BasketProvider>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <Header />

        {/* Main Content */}
        <main className="flex-grow flex flex-col items-center justify-center bg-gray-100">
          <Component {...pageProps} />
          <AddToBasketPopup />
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
