// contexts/SessionContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  getSession,
  acceptCookies as acceptCookiesAPI,
  deleteSession as deleteSessionAPI,
  getBasket as getBasketAPI,
  updateSession as updateSessionAPI,
} from '../lib/session';

interface SessionData {
  newlyCreated?: boolean;
  session?: {
    id?: string;
    allow_cookies?: boolean;
    basket_details?: any;
  };
}

interface ISessionContext {
  session: SessionData | null;
  loading: boolean;
  error: any;

  // Named param approach or signature approach
  fetchSession: (noBasket?: boolean) => Promise<void>;
  acceptCookies: (sessionId?: string) => Promise<void>;
  deleteSession: (sessionId?: string) => Promise<void>;
  getBasket: (sessionId?: string) => Promise<any>;
  updateSession: (
    params: {
      action: 'addItem' | 'removeItem' | 'updateQuantity' | 'updateCustomerDetails';
      data?: any;
      sessionId?: string;
    }
  ) => Promise<any>;
}

const SessionContext = createContext<ISessionContext | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    void fetchSession(false);
  }, []);

  async function fetchSession(noBasket = false) {
    setLoading(true);
    try {
      const res = await getSession(noBasket);
      setSession(res);
      setError(null);
    } catch (err) {
      console.error('Error fetching session in SessionProvider:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  async function acceptCookies(sessionId?: string) {
    try {
      const result = await acceptCookiesAPI(sessionId);
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

  async function deleteSession(sessionId?: string) {
    try {
      await deleteSessionAPI(sessionId);
      setSession(null);
    } catch (err) {
      console.error('Error deleting session:', err);
      setError(err);
    }
  }

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

  /**
   * updateSession - new signature using named params
   */
  async function updateSession({
    action,
    data = {},
    sessionId,
  }: {
    action: 'addItem' | 'removeItem' | 'updateQuantity' | 'updateCustomerDetails';
    data?: any;
    sessionId?: string;
  }) {
    try {
      const response = await updateSessionAPI({ action, data, sessionId });

      // If server returns updated items in response.items:
      if (response?.success && response.items) {
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
      return response;
    } catch (err) {
      console.error(`Error with updateSession (${action}):`, err);
      setError(err);
      throw err;
    }
  }

  const value: ISessionContext = {
    session,
    loading,
    error,
    fetchSession,
    acceptCookies,
    deleteSession,
    getBasket,
    updateSession,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within a SessionProvider.');
  }
  return context;
}
