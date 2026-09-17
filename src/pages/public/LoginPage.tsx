import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';

export function LoginPage() {
  const { session, isLoading, error: configError, supabase } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      navigate('/app', { replace: true });
    }
  }, [session, navigate]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">Loading session...</div>;
  }

  if (session) {
    return <Navigate to="/app" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setIsSigningIn(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setAuthError(error.message);
    } else {
      navigate('/app', { replace: true });
    }
    setIsSigningIn(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setIsSigningIn(true);
    setAuthError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      setAuthError(error.message);
    } else {
      setAuthError('Check your email for the confirmation link.');
    }
    setIsSigningIn(false);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-300 p-4">
      <div className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-slate-100 mb-6 text-center">Login to GuardAI</h1>
        
        {configError ? (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg">
            <p className="font-semibold mb-2">Supabase Not Configured</p>
            <p className="text-sm">The environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing. Please configure them to enable authentication.</p>
          </div>
        ) : (
          <form className="space-y-4">
            {authError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-md text-sm">
                {authError}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="name@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••••"
              />
            </div>
            <div className="pt-2 flex gap-3">
              <Button 
                type="submit" 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleSignIn}
                disabled={isSigningIn}
              >
                {isSigningIn ? 'Loading...' : 'Sign In'}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                className="flex-1 border-slate-700 hover:bg-slate-800"
                onClick={handleSignUp}
                disabled={isSigningIn}
              >
                Sign Up
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
