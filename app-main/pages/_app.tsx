// pages/_app.tsx
import type { AppProps } from 'next/app';
import '../styles/globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CookieConsent from '../components/CookieConsent';
import { BasketProvider } from '../components/BasketContext';
import React, { useState, useEffect, JSX } from 'react';
import { useRouter } from 'next/router';
import * as gtag from '../lib/gtag';

export default function MyApp({ Component, pageProps }: AppProps): JSX.Element {
  const router = useRouter();
  const [isStorageEnabled, setIsStorageEnabled] = useState(true);

  // Check local storage and cookies
  useEffect(() => {
    let storageEnabled = true;
    try {
      // Test localStorage
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
    } catch (e) {
      storageEnabled = false;
    }

    try {
      // Test basic cookie usage
      document.cookie = 'testcookie=1; SameSite=Strict';
      if (document.cookie.indexOf('testcookie=') === -1) {
        storageEnabled = false;
      } else {
        // clean up
        document.cookie =
          'testcookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict';
      }
    } catch (e) {
      storageEnabled = false;
    }

    if (!storageEnabled) {
      setIsStorageEnabled(false);
    }
  }, []);

  // Google Analytics page view
  useEffect(() => {
    const handleRouteChange = (url: string) => {
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
        {/* Development Warning */}
        <div className="bg-orange-500 text-white text-center p-2">
          This website is still under development.
        </div>

        {/* Cookie/Local Storage Warning */}
        {!isStorageEnabled && (
          <div className="bg-red-500 text-white text-center p-2">
            Our website requires cookies and local storage to function properly.
            Please enable cookies and local storage in your browser settings.
          </div>
        )}

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
