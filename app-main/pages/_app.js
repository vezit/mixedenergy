// pages/_app.js
import '../styles/globals.css';
import Header from '../components/Header';                    // Import the Header component
import Footer from '../components/Footer';                    // Import the Footer component
import { useModal } from '../lib/modals';                     // Import the useModal hook
import CookieConsent from '../components/CookieConsent';      // Import the CookieConsent component
import { BasketProvider } from '../components/BasketContext';        // Import BasketProvider
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import * as gtag from '../lib/gtag';                          // Import Google Analytics tracking functions
import { db } from '../lib/firebase';                         // Import db directly
import { doc, getDoc, setDoc } from 'firebase/firestore';      // Import necessary Firestore functions
// import DomainModal from '../components/DomainModal'; // Import the new DomainModal


function MyApp({ Component, pageProps }) {
  const { isModalOpen, closeModal } = useModal(true);
  const router = useRouter();

  // Helper function to get a cookie by name
  const getCookie = (name) => {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0)
        return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

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

  // Check for session cookie and Firebase session on any page load
  useEffect(() => {
    const consentId = getCookie('cookie_consent_id');
    if (consentId) {
      const docRef = doc(db, 'sessions', consentId);

      getDoc(docRef)
        .then((docSnap) => {
          if (!docSnap.exists()) {
            // Session does not exist in Firebase, create it
            setDoc(docRef, {
              consentId: consentId,
              createdAt: new Date(),
              basketItems: [],
              customerDetails: {},
            });
          }
        })
        .catch((error) => {
          console.error('Error checking session in Firebase:', error);
        });
    }
  }, []);

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
