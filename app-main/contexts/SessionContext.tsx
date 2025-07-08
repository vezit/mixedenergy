// contexts/SessionContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import axios from 'axios';

/** Minimal shape for your session */
export interface SessionRow {
  session_id: string;
  basket_details?: any; // expand with your actual basket type
  allow_cookies?: boolean;
  temporary_selections?: Record<string, any>;
  [key: string]: any;
}

/** Define param interfaces for clarity */
interface CreateTempSelectionParams {
  sessionId: string;
  selectedProducts: Record<string, number>;
  selectedSize: number;
  packageSlug: string;
  isMysteryBox?: boolean;
  sugarPreference?: string;
}

interface GenerateRandomSelectionParams {
  sessionId: string;
  slug: string;
  selectedSize: number;
  sugarPreference?: 'alle' | 'med_sukker' | 'uden_sukker';
  isCustomSelection?: boolean;
  selectedProducts?: Record<string, number>;
}

interface GetCalcPriceParams {
  slug: string;
  selectedSize: number;
  selectedProducts?: Record<string, number>;
  isMysteryBox?: boolean;
  sugarPreference?: 'alle' | 'med_sukker' | 'uden_sukker';
}

interface SessionProviderProps {
  children: ReactNode;
  // we pass the SSR session from _app or pages
  initialSession?: SessionRow | null;
}

/**
 * The interface for our session context.
 * Adjust fetchSession to return 'SessionRow | null' if you want the immediate data.
 */
interface ISessionContext {
  session: SessionRow | null;
  loading: boolean;
  error: string | null;

  /**
   * If you need to refetch session data from the server (without creating a new one).
   * Now returns the fetched session object (or null on error).
   */
  fetchSession: (noBasket?: boolean) => Promise<SessionRow | null>;

  /**
   * Simply returns whatever session we have in memory, without calling the server.
   */
  getSession: () => SessionRow | null;

  /**
   * POST /api/supabase/session => update session with {action,...}
   * - we store any returned `session` in state.
   */
  updateSession: (action: string, body?: Record<string, any>) => Promise<any>;

  /**
   * Return session.temporary_selections from in-memory state (or {} if not present)
   */
  getTemporarySelections: () => Record<string, any>;

  /**
   * Create or update a selection in DB's temporary_selections
   * (calls "createTemporarySelection" server-side).
   */
  createOrUpdateTemporarySelection: (params: CreateTempSelectionParams) => Promise<any>;

  // Additional specialized
  generateRandomSelection: (params: GenerateRandomSelectionParams) => Promise<any>;
  getCalculatedPackagePrice: (params: GetCalcPriceParams) => Promise<any>;

  /**
   * Accept cookies (sets allow_cookies = true in the DB)
   */
  acceptCookies: (sessionId?: string) => Promise<void>;
}

/** Create a default context object (stubbed functions to avoid undefined checks) */
const SessionContext = createContext<ISessionContext>({
  session: null,
  loading: false,
  error: null,
  fetchSession: async () => null,
  getSession: () => null,
  updateSession: async () => undefined,
  getTemporarySelections: () => ({}),
  createOrUpdateTemporarySelection: async () => ({}),
  generateRandomSelection: async () => ({}),
  getCalculatedPackagePrice: async () => ({}),
  acceptCookies: async () => undefined,
});

export function SessionProvider({ children, initialSession }: SessionProviderProps) {
  const [session, setSession] = useState<SessionRow | null>(initialSession || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * fetchSession => GET /api/supabase/session (only if you want to re-fetch).
   * Returns the newly fetched session data (or null on error).
   */
  const fetchSession = useCallback(async (noBasket?: boolean): Promise<SessionRow | null> => {
    try {
      setLoading(true);
      setError(null);

      const resp = await axios.get<{ session?: SessionRow }>('/api/supabase/session', {
        params: noBasket ? { noBasket: 1 } : {},
      });
      // Usually returns { newlyCreated, session }
      const fetchedSession = resp.data.session || null;
      setSession(fetchedSession);

      return fetchedSession;
    } catch (err: any) {
      console.error('[SessionProvider] fetchSession error:', err);
      setError(err.message);
      setSession(null);
      return null; // or throw err
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * getSession => just returns what we have in memory (session state).
   * Does NOT call the server.
   */
  function getSession(): SessionRow | null {
    return session;
  }

  /**
   * updateSession => POST /api/supabase/session, pass {action, ...body}.
   * If the server returns a session, we store it in state.
   */
  async function updateSession(action: string, body: Record<string, any> = {}) {
    try {
      setLoading(true);
      setError(null);

      console.log('[SessionProvider] updateSession action=', action, ' body=', body);
      const resp = await axios.post('/api/supabase/session', {
        action,
        ...body,
      });

      // If the response includes a "session" object, store it in state
      if (resp.data?.session) {
        setSession(resp.data.session);
      }

      return resp.data;
    } catch (err: any) {
      console.error('[SessionProvider] updateSession error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  /**
   * acceptCookies => POST /api/supabase/session with action=acceptCookies
   */
  async function acceptCookies(sessionId?: string) {
    try {
      console.log('[SessionProvider] acceptCookies sessionId=', sessionId);
      setLoading(true);
      setError(null);

      const resp = await axios.post('/api/supabase/session', {
        action: 'acceptCookies',
        sessionId,
      });
      if (resp.data?.session) {
        setSession(resp.data.session);
      }
    } catch (err: any) {
      console.error('[SessionProvider] acceptCookies error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /**
   * getTemporarySelections => in-memory from session.temporary_selections
   */
  function getTemporarySelections(): Record<string, any> {
    return session?.temporary_selections || {};
  }

  /**
   * createOrUpdateTemporarySelection => calls action="createTemporarySelection"
   */
  async function createOrUpdateTemporarySelection(params: CreateTempSelectionParams) {
    return updateSession('createTemporarySelection', params);
  }

  /**
   * Additional specialized methods
   */
  async function generateRandomSelection(params: GenerateRandomSelectionParams) {
    return updateSession('generateRandomSelection', params);
  }

  async function getCalculatedPackagePrice(params: GetCalcPriceParams) {
    return updateSession('getCalculatedPackagePrice', params);
  }

  /** Provide all the context values */
  const value: ISessionContext = {
    session,
    loading,
    error,

    fetchSession,
    getSession,

    updateSession,

    getTemporarySelections,
    createOrUpdateTemporarySelection,
    generateRandomSelection,
    getCalculatedPackagePrice,
    acceptCookies,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/**
 * Hook to access the SessionContext easily from components.
 */
export function useSessionContext(): ISessionContext {
  return useContext(SessionContext);
}
