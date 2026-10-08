import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createClient, type Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: ReturnType<typeof createClient> | null = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  supabase: typeof supabase;
  // In-memory only: a normal SIGNED_IN/INITIAL_SESSION is not a recovery grant.
  isPasswordRecoverySession: boolean;
  clearPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
  error: null,
  supabase: null,
  isPasswordRecoverySession: false,
  clearPasswordRecovery: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recoveryUserId, setRecoveryUserId] = useState<string | null>(null);

  const clearPasswordRecovery = useCallback(() => setRecoveryUserId(null), []);

  useEffect(() => {
    if (!supabase) {
      setError('Missing Supabase configuration (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).');
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let receivedAuthEvent = false;

    // Subscribe before getSession so a slower initial session read cannot
    // overwrite a newer SIGNED_IN/PASSWORD_RECOVERY/SIGNED_OUT event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (cancelled) return;
      receivedAuthEvent = true;
      setSession(nextSession);
      setError(null);
      setIsLoading(false);

      if (event === 'PASSWORD_RECOVERY' && nextSession) {
        setRecoveryUserId(nextSession.user.id);
      } else if (event === 'SIGNED_OUT' || !nextSession) {
        setRecoveryUserId(null);
      } else {
        // A new identity may never inherit another account's recovery grant.
        setRecoveryUserId(previous => previous === nextSession.user.id ? previous : null);
      }
    });

    void supabase.auth.getSession()
      .then(({ data, error: authError }) => {
        if (cancelled || receivedAuthEvent) return;
        if (authError) {
          setError(authError.message);
          setSession(null);
          setRecoveryUserId(null);
        } else {
          setSession(data.session);
        }
        setIsLoading(false);
      })
      .catch((authError: unknown) => {
        if (cancelled || receivedAuthEvent) return;
        setError(authError instanceof Error ? authError.message : 'Could not initialize authentication.');
        setSession(null);
        setRecoveryUserId(null);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const isPasswordRecoverySession = !!session &&
    !!recoveryUserId &&
    recoveryUserId === session.user.id;

  return (
    <AuthContext.Provider value={{
      session,
      isLoading,
      error,
      supabase,
      isPasswordRecoverySession,
      clearPasswordRecovery,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
