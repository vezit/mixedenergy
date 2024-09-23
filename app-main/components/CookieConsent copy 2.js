// /components/CookieConsent.js
import { useState, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase'; // Import db directly

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  // Helper functions to get and set cookies
  const setCookie = (name, value, days) => {
    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(
        date.getTime() + days * 24 * 60 * 60 * 1000
      );
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie =
      name + '=' + (value || '') + expires + '; path=/';
  };

  const getCookie = (name) => {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ')
        c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0)
        return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

  const generateConsentId = () => {
    return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, () => {
      return Math.floor(Math.random() * 16).toString(16);
    });
  };

  useEffect(() => {
    const consentId = getCookie('cookie_consent_id');
    if (!consentId) {
      setShow(true);
    } else {
      const docRef = doc(db, 'sessions', consentId);
      getDoc(docRef).then((docSnap) => {
        if (!docSnap.exists()) {
          setDoc(docRef, {
            consentId: consentId,
            createdAt: new Date(),
            basketItems: [],
            customerDetails: {},
          });
        }
      });
    }
  }, []);

  const acceptCookies = async () => {
    setShow(false);
    const consentId = generateConsentId();
    setCookie('cookie_consent_id', consentId, 365);

    const docRef = doc(db, 'sessions', consentId);
    await setDoc(docRef, {
      consentId: consentId,
      createdAt: new Date(),
      basketItems: [],
      customerDetails: {},
    });
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-800 text-white flex justify-between items-center">
      <p className="text-sm">
        Vi bruger cookies for at forbedre din oplevelse. Ved at fortsætte accepterer du vores brug af cookies.
        <a href="/cookiepolitik" className="underline ml-2">
          Læs mere
        </a>
        .
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
