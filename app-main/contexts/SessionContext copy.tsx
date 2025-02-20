// contexts/SessionContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import axios from 'axios';

// Minimal shape for your "session"
interface SessionRow {
  session_id: string;
  basket_details?: any; // expand with your actual basket type
  allow_cookies?: boolean;
  temporary_selections?: Record<string, any>;
  [key: string]: any;
}

interface ISessionContext {
  session: SessionRow | null;
  loading: boolean;
  error: string | null;

  /** (Optional) If you need to refetch session data without creating a new one. */
  fetchSession: (noBasket?: boolean) => Promise<void>;

  /**
   * POST /api/supabase/session => update session with {action,...}
   *  - we store any returned `session` in state
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
   * Accept cookies
   */
  acceptCookies: (sessionId?: string) => Promise<void>;
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

const SessionContext = createContext<ISessionContext>({
  session: null,
  loading: false,
  error: null,
  fetchSession: async () => undefined,
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
   * fetchSession => GET /api/supabase/session (only if you want to refetch)
   */
  const fetchSession = useCallback(async (noBasket?: boolean) => {
    try {
      setLoading(true);
      setError(null);

      console.log('[SessionProvider] fetchSession called with noBasket=', noBasket);
      const query = noBasket ? '?noBasket=1' : '';
      const resp = await axios.get('/api/supabase/session' + query);
      // Usually returns { newlyCreated, session }
      console.log('[SessionProvider] fetchSession response:', resp.data);
      setSession(resp.data.session || null);
      
    } catch (err: any) {
      console.error('[SessionProvider] fetchSession error:', err);
      setError(err.message);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * updateSession => POST /api/supabase/session, pass {action, ...body}
   *   - If server returns a session, we store it
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
   * 1) getTemporarySelections => in-memory from session.temporary_selections
   */
  function getTemporarySelections(): Record<string, any> {
    return session?.temporary_selections || {};
  }

  /**
   * 2) createOrUpdateTemporarySelection => calls action="createTemporarySelection"
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

  const value: ISessionContext = {
    session,
    loading,
    error,

    fetchSession,          // if you need a manual re-fetch
    updateSession,

    getTemporarySelections,
    createOrUpdateTemporarySelection,

    generateRandomSelection,
    getCalculatedPackagePrice,

    acceptCookies,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext() {
  return useContext(SessionContext);
}
