// contexts/SessionContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
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

  /** GET /api/supabase/session => fetch or create a session in DB */
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

  // You can still keep your other specialized methods:
  generateRandomSelection: (params: GenerateRandomSelectionParams) => Promise<any>;
  getCalculatedPackagePrice: (params: GetCalcPriceParams) => Promise<any>;
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
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionRow | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * fetchSession => GET /api/supabase/session
   *   - updates local `session` state
   */
  const fetchSession = useCallback(async (noBasket?: boolean) => {
    try {
      setLoading(true);
      setError(null);

      const query = noBasket ? '?noBasket=1' : '';
      const resp = await axios.get('/api/supabase/session' + query);
      // Usually returns { newlyCreated, session }
      setSession(resp.data.session || null);
    } catch (err: any) {
      setError(err.message);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount, try to fetch/create session automatically
  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  /**
   * updateSession => POST /api/supabase/session, pass {action, ...body}
   *   - If server returns a session, we store it
   */
  async function updateSession(action: string, body: Record<string, any> = {}) {
    try {
      setLoading(true);
      setError(null);

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
      setError(err.message);
      throw err;
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
   *    This merges or replaces a selection in the DB's session.temporary_selections
   */
  async function createOrUpdateTemporarySelection(params: CreateTempSelectionParams) {
    // This calls our single route => calls createTemporarySelection server-side
    return updateSession('createTemporarySelection', params);
  }

  /**
   * Additional specialized methods if you wish
   */
  async function generateRandomSelection(params: GenerateRandomSelectionParams) {
    return updateSession('generateRandomSelection', params);
  }

  async function getCalculatedPackagePrice(params: GetCalcPriceParams) {
    return updateSession('getCalculatedPackagePrice', params);
  }

  // Provide everything in the context
  const value: ISessionContext = {
    session,
    loading,
    error,

    fetchSession,
    updateSession,

    getTemporarySelections,
    createOrUpdateTemporarySelection,

    generateRandomSelection,
    getCalculatedPackagePrice,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext() {
  return useContext(SessionContext);
}
