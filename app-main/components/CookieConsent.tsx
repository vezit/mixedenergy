import React, { useEffect, useState } from 'react';
import { useSessionContext } from '../contexts/SessionContext';
import { getCookie } from '../lib/cookies';

const CookieConsent: React.FC = () => {
  const [show, setShow] = useState(false);
  const [cookieError, setCookieError] = useState(false);

  // read from SessionContext
  const { session, loading, error, acceptCookies } = useSessionContext();

  // if we had an error from session fetch
  useEffect(() => {
    if (error) {
      console.error('Error fetching session:', error);
      setCookieError(true);
    }
  }, [error]);

  // show cookie consent if allow_cookies is false
  useEffect(() => {
    if (!loading && session?.session && !session.session.allow_cookies) {
      setShow(true);
    }
  }, [loading, session]);

  const onAcceptCookies = async () => {
    try {
      // get local session cookie if you want
      const localSessionId = getCookie('session_id');
      await acceptCookies(localSessionId);
      setShow(false);
    } catch (err) {
      console.error('Error updating cookie consent:', err);
    }
  };

  if (cookieError) {
    return (
      <div className="fixed top-0 left-0 right-0 p-4 bg-red-500 text-white text-center">
        <p>
          For at kunne bruge denne hjemmeside, skal du tillade cookies. Venligst
          slå cookies til i din browserindstillinger, før du fortsætter.
        </p>
      </div>
    );
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-800 text-white flex justify-between items-center">
      <p className="text-sm">
        Vi bruger cookies for at forbedre din oplevelse. Ved at fortsætte
        accepterer du vores brug af cookies.{' '}
        <a href="/cookiepolitik" className="underline ml-2">
          Læs mere
        </a>.
      </p>
      <div>
        <button onClick={onAcceptCookies} className="bg-green-500 text-white px-4 py-2 rounded">
          Tillad alle cookies
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;
