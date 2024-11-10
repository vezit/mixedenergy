// pages/_app.js
import '../styles/globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CookieConsent from '../components/CookieConsent';
import { BasketProvider } from '../components/BasketContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import * as gtag from '../lib/gtag';
import AddToBasketPopup from '../components/AddToBasketPopup';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [isStorageEnabled, setIsStorageEnabled] = useState(true);

  useEffect(() => {
    let storageEnabled = true;
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
    } catch (e) {
      storageEnabled = false;
    }

    try {
      document.cookie = "testcookie=1; SameSite=Strict";
      if (document.cookie.indexOf("testcookie=") === -1) {
        storageEnabled = false;
      } else {
        document.cookie = "testcookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict";
      }
    } catch (e) {
      storageEnabled = false;
    }

    if (!storageEnabled) {
      setIsStorageEnabled(false);
    }
  }, []);

  useEffect(() => {
    const handleRouteChange = (url) => {
      gtag.pageview(url);
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  return (
    <BasketProvider>
      <div className="flex flex-col min-h-screen">
        {/* Warning message displayed above the header */}
        {!isStorageEnabled && (
          <div className="bg-red-500 text-white text-center p-2">
            Our website requires cookies and local storage to function properly. Please enable cookies and local storage in your browser settings.
          </div>
        )}

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
