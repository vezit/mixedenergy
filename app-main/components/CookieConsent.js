// /components/CookieConsent.js
import { useState, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase'; // Import db directly

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const [cookieError, setCookieError] = useState(false);

  // Helper functions to get and set cookies
  const setCookie = (name, value, days) => {
    try {
      let expires = '';
      if (days) {
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = '; expires=' + date.toUTCString();
      }
      document.cookie = name + '=' + (value || '') + expires + '; path=/';
      return true;
    } catch (error) {
      return false;
    }
  };

  const getCookie = (name) => {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

  const generateConsentId = () => {
    return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, () => {
      return Math.floor(Math.random() * 16).toString(16);
    });
  };

  useEffect(() => {
    // Try setting the cookie immediately upon page load
    const consentId = getCookie('cookie_consent_id') || generateConsentId();
    const cookieSet = setCookie('cookie_consent_id', consentId, 365);

    // If cookie can't be set, show error message and block interaction
    if (!cookieSet) {
      setCookieError(true);
      return;
    }

    const docRef = doc(db, 'sessions', consentId);
    getDoc(docRef).then((docSnap) => {
      if (docSnap.exists()) {
        const sessionData = docSnap.data();
        if (!sessionData.allowCookies) {
          setShow(true); // Show banner if cookies aren't allowed yet
        }
      } else {
        // Create session document if it doesn't exist
        setDoc(docRef, {
          consentId: consentId,
          allowCookies: false, // Initially set to false
          createdAt: new Date(),
          basketItems: [],
          customerDetails: {},
        });
        setShow(true); // Show banner since cookies aren't allowed yet
      }
    });
  }, []);

  const acceptCookies = async () => {
    setShow(false);
    const consentId = getCookie('cookie_consent_id') || generateConsentId();
    const docRef = doc(db, 'sessions', consentId);
    await setDoc(docRef, {
      consentId: consentId,
      allowCookies: true, // Update to true when user accepts cookies
      createdAt: new Date(),
      basketItems: [], // Retain existing session data or fetch it
      customerDetails: {},
    }, { merge: true }); // Use merge to avoid overwriting existing fields
  };

  if (cookieError) {
    return (
      <div className="fixed top-0 left-0 right-0 p-4 bg-red-500 text-white text-center">
        <p>
          For at kunne bruge denne hjemmeside, skal du tillade cookies.
          Venligst slå cookies til i din browserindstillinger, før du fortsætter.
        </p>
      </div>
    );
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-800 text-white flex justify-between items-center">
      <p className="text-sm">
        Vi bruger cookies for at forbedre din oplevelse. Ved at fortsætte accepterer du vores brug af cookies.
        <a href="/cookiepolitik" className="underline ml-2">Læs mere</a>.
      </p>
      <div>
        <button
          onClick={acceptCookies}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Tillad alle cookies
        </button>
      </div>
    </div>
  );
}
