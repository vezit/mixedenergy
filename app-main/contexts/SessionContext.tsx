// contexts/SessionContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  getSession,
  acceptCookies as acceptCookiesAPI,
  deleteSession as deleteSessionAPI,
  getBasket as getBasketAPI,
  updateSession as updateSessionAPI,
} from '../lib/session';

// 1) Type of the "session" data from server
interface SessionData {
  newlyCreated?: boolean;
  // The "session" object is often an object with fields like "id", "allow_cookies", "basket_details", etc.
  // For best TS, define these fields precisely.
  session?: {
    id?: string;
    allow_cookies?: boolean;
    basket_details?: any;
    // ...
  };
}

// 2) The shape of everything we provide in the context
interface ISessionContext {
  // State
  session: SessionData | null; // the actual session data from DB
  loading: boolean;
  error: any;

  // Actions
  fetchSession: (noBasket?: boolean) => Promise<void>;
  acceptCookies: (sessionId?: string | null) => Promise<void>;
  deleteSession: (sessionId?: string) => Promise<void>;
  getBasket: (sessionId?: string) => Promise<any>;
  updateSession: (
    action: 'addItem' | 'removeItem' | 'updateQuantity' | 'updateCustomerDetails',
    data?: any,
    sessionId?: string
  ) => Promise<any>;
}

const SessionContext = createContext<ISessionContext | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  // 3) Local state for the session, loading, and errors
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  // 4) On mount, fetch or create the session
  useEffect(() => {
    void fetchSession(false);
  }, []);

  // 5) fetchSession function
  async function fetchSession(noBasket = false) {
    setLoading(true);
    try {
      const res = await getSession(noBasket);
      setSession(res); // { newlyCreated, session: {...} }
      setError(null);
    } catch (err) {
      console.error('Error fetching session in SessionProvider:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  // 6) acceptCookies
  async function acceptCookies(sessionId?: string | null) {
    try {
      const result = await acceptCookiesAPI(sessionId);
      // If success => update local state so allow_cookies = true
      if (result.success) {
        setSession((prev) =>
          prev
            ? {
                ...prev,
                session: {
                  ...(prev.session || {}),
                  allow_cookies: true,
                },
              }
            : prev
        );
      }
    } catch (err) {
      console.error('Error accepting cookies:', err);
      setError(err);
    }
  }

  // 7) deleteSession
  async function deleteSession(sessionId?: string) {
    try {
      await deleteSessionAPI(sessionId);
      // Clear local session state (or refetch if you want to confirm)
      setSession(null);
    } catch (err) {
      console.error('Error deleting session:', err);
      setError(err);
    }
  }

  // 8) getBasket
  async function getBasket(sessionId?: string) {
    try {
      const basket = await getBasketAPI(sessionId);
      return basket;
    } catch (err) {
      console.error('Error fetching basket:', err);
      setError(err);
      throw err;
    }
  }

  // 9) updateSession
  async function updateSession(
    action: 'addItem' | 'removeItem' | 'updateQuantity' | 'updateCustomerDetails',
    data: any = {},
    sessionId?: string
  ) {
    try {
      const response = await updateSessionAPI(action, data, sessionId);

      // Possibly update local session data. For example, if it returns updated items:
      if (response?.success && response.items) {
        // Let's assume your server returns updated basket details in `response.items`
        setSession((prev) =>
          prev
            ? {
                ...prev,
                session: {
                  ...(prev.session || {}),
                  basket_details: {
                    ...((prev.session || {}).basket_details || {}),
                    items: response.items,
                  },
                },
              }
            : prev
        );
      }

      // If it updates other parts of the session, merge them here
      return response;
    } catch (err) {
      console.error(`Error with updateSession (${action}):`, err);
      setError(err);
      throw err;
    }
  }

  // 10) Put all in a value object
  const value: ISessionContext = {
    session,
    loading,
    error,

    // methods
    fetchSession,
    acceptCookies,
    deleteSession,
    getBasket,
    updateSession,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

// 11) A custom hook for easy usage
export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within a SessionProvider.');
  }
  return context;
}
