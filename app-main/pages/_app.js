// pages/_app.js
import '../styles/globals.css';
import Header from '../components/Header';          // Import the Header component
import Footer from '../components/Footer';          // Import the Footer component
import { useModal } from '../lib/modals';           // Import the useModal hook
import CookieConsent from '../components/CookieConsent'; // Import the CookieConsent component
import { BasketProvider } from '../lib/BasketContext';   // Import BasketProvider
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import * as gtag from '../lib/gtag';                // Import Google Analytics tracking functions

function MyApp({ Component, pageProps }) {
  const { isModalOpen, closeModal } = useModal(true);
  const router = useRouter();

  // Track page views when the route changes
  useEffect(() => {
    const handleRouteChange = (url) => {
      gtag.pageview(url);  // Send pageview event to Google Analytics
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  return (
    <BasketProvider>
      <div className="flex flex-col min-h-screen">
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
