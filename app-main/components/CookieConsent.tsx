import React, { useEffect, useState } from 'react';
import { useSessionContext } from '../contexts/SessionContext';
import { getCookie } from '../lib/cookies';

const CookieConsent: React.FC = () => {
  const [show, setShow] = useState(false);
  const [cookieError, setCookieError] = useState(false);

  // We destructure both acceptCookies and fetchSession:
  const { session, loading, error, acceptCookies, fetchSession } = useSessionContext();

  // if we had an error from session fetch
  useEffect(() => {
    if (error) {
      console.error('Error fetching session:', error);
      setCookieError(true);
    }
  }, [error]);

  // Decide if we should show the bar each time session/loading changes
  useEffect(() => {
    if (!loading && session) {
      // If allow_cookies is false, show; otherwise hide
      setShow(!session.allow_cookies);
    }
  }, [loading, session]);

  const onAcceptCookies = async () => {
    try {
      const localSessionId = getCookie('session_id'); // string | null
      await acceptCookies(localSessionId || undefined);

      // To ensure we have the very latest session (with allow_cookies=true):
      await fetchSession();
      // After that, the useEffect should see session.allow_cookies === true
      // and call setShow(false).
    } catch (err) {
      console.error('Error updating cookie consent:', err);
    }
  };

  // If there's a cookie error, show a "please enable cookies" banner instead
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

  // If show=false, do not render the banner at all
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
