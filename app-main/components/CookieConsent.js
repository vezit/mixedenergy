import { useState, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCookie, setCookie } from '../lib/cookies';
import { v4 as uuidv4 } from 'uuid'; // Use a UUID library

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const [cookieError, setCookieError] = useState(false);

  const generateConsentId = () => {
    return uuidv4(); // Generate a secure UUID
  };

  useEffect(() => {
    let consentId = getCookie('cookie_consent_id');
    if (!consentId) {
      consentId = generateConsentId();
      const cookieSet = setCookie('cookie_consent_id', consentId, 365);
      if (!cookieSet) {
        setCookieError(true);
        return;
      }
    }

    const docRef = doc(db, 'sessions', consentId);

    getDoc(docRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          const sessionData = docSnap.data();
          if (!sessionData.allowCookies) {
            setShow(true); // Show banner if cookies aren't allowed yet
          }
        } else {
          // Create session document if it doesn't exist
          setDoc(docRef, {
            consentId: consentId, // Ensure consentId matches document ID
            allowCookies: false, // Initially set to false
            createdAt: new Date(),
            updatedAt: new Date(),
          })
            .then(() => {
              setShow(true); // Show banner since cookies aren't allowed yet
            })
            .catch((error) => {
              console.error('Error creating session document:', error);
            });
        }
      })
      .catch((error) => {
        console.error('Error getting session document:', error);
      });
  }, []);

  const acceptCookies = async () => {
    const consentId = getCookie('cookie_consent_id');
    if (!consentId) {
      console.error('No consentId found in cookies');
      return;
    }

    const docRef = doc(db, 'sessions', consentId);

    await setDoc(
      docRef,
      {
        consentId: consentId, // Ensure consentId matches document ID
        allowCookies: true,
        updatedAt: new Date(),
      },
      { merge: true }
    ).catch((error) => {
      console.error('Error updating session document:', error);
    });

    setShow(false); // Hide banner after accepting cookies
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
