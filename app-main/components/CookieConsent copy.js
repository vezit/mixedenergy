// components/CookieConsent.js

import { useState, useEffect } from 'react';
import { getCookie, setCookie } from '../lib/cookies';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const [cookieError, setCookieError] = useState(false);

  const generateSessionId = () => {
    // Generate the full UUID and slice it to get the desired length
    return uuidv4().slice(0, 30); // Returns the first 30 characters
  };

  const createSessionWithUniqueId = async () => {
    let attempts = 0;
    let maxAttempts = 5;
    let sessionId = generateSessionId();

    while (attempts < maxAttempts) {
      try {
        // Try to create the session with the generated sessionId
        await axios.post('/api/firebase/1-createSession', { sessionId });

        // If successful, set the cookie and break the loop
        const cookieSet = setCookie('session_id', sessionId, 1);
        if (!cookieSet) {
          setCookieError(true);
          return;
        }
        setShow(true); // Show banner since cookies aren't allowed yet
        return;
      } catch (error) {
        if (
          error.response &&
          error.response.data &&
          error.response.data.error === 'Session ID already exists'
        ) {
          // Session ID already exists, generate a new one
          sessionId = generateSessionId();
          attempts++;
        } else {
          console.error('Error creating session:', error);
          return;
        }
      }
    }

    // If all attempts fail, show an error
    console.error('Failed to create a unique session ID after multiple attempts.');
  };

  useEffect(() => {
    let cookieSessionId = getCookie('session_id');
    if (!cookieSessionId) {
      createSessionWithUniqueId();
    } else {
      // Fetch session data via API
      axios
        .get('/api/firebase/1-getSession')
        .then((response) => {
          if (!response.data.session.allowCookies) {
            setShow(true); // Show banner if cookies aren't allowed yet
          }
        })
        .catch((error) => {
          if (error.response && error.response.status === 404) {
            // Session does not exist, create it
            createSessionWithUniqueId();
          } else {
            console.error('Error fetching session:', error);
          }
        });
    }
  }, []);

  const acceptCookies = async () => {
    try {
      const sessionId = getCookie('session_id');
      const response = await axios.post('/api/firebase/1-acceptCookies', { sessionId });
      if (response.data.success) {
        setShow(false); // Hide banner after accepting cookies
      }
    } catch (error) {
      if (
        error.response &&
        error.response.data &&
        error.response.data.error.includes('enable cookies')
      ) {
        // Display a message if cookies are not enabled
        alert('Cookies are required for the site to function. Please enable cookies in your browser settings.');
      } else {
        console.error('Error updating cookie consent:', error);
      }
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
