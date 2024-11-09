// components/CookieConsent.js

import { useState, useEffect } from 'react';
import { getCookie, setCookie } from '../lib/cookies';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const [cookieError, setCookieError] = useState(false);

  const generateConsentAndSessionId = () => {
    return uuidv4();
  };

  useEffect(() => {
    let cookieConsentAndSessionId = getCookie('consent_and_session_id');
    if (!cookieConsentAndSessionId) {
      cookieConsentAndSessionId = generateConsentAndSessionId();
      const cookieSet = setCookie('consent_and_session_id', cookieConsentAndSessionId, 365);
      if (!cookieSet) {
        setCookieError(true);
        return;
      }

      // Create session via API
      axios
        .post('/api/createSession')
        .then(() => {
          setShow(true); // Show banner since cookies aren't allowed yet
        })
        .catch((error) => {
          console.error('Error creating session:', error);
        });
    } else {
      // Fetch session data via API
      axios
        .get('/api/getSession')
        .then((response) => {
          if (!response.data.session.allowCookies) {
            setShow(true); // Show banner if cookies aren't allowed yet
          }
        })
        .catch((error) => {
          if (error.response && error.response.status === 404) {
            // Session does not exist, create it
            axios
              .post('/api/createSession')
              .then(() => {
                setShow(true);
              })
              .catch((err) => {
                console.error('Error creating session:', err);
              });
          } else {
            console.error('Error fetching session:', error);
          }
        });
    }
  }, []);

  const acceptCookies = async () => {
    try {
      await axios.post('/api/acceptCookies');
      setShow(false); // Hide banner after accepting cookies
    } catch (error) {
      console.error('Error updating cookie consent:', error);
    }
  };

  if (cookieError) {
    return (
      <div className="fixed top-0 left-0 right-0 p-4 bg-red-500 text-white text-center">
        <p>
          For at kunne bruge denne hjemmeside, skal du tillade cookies.
          Venligst slå cookies til i din browserindstillinger, før du
          fortsætter.
        </p>
      </div>
    );
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-800 text-white flex justify-between items-center">
      <p className="text-sm">
        Vi bruger cookies for at forbedre din oplevelse. Ved at fortsætte
        accepterer du vores brug af cookies.
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
