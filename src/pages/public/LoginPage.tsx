import { useAuth } from '../../auth/AuthProvider';

export function LoginPage() {
  const { error } = useAuth();

  return (
    <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-300 p-4">
      <div className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-slate-100 mb-6 text-center">Login to GuardAI</h1>
        
        {error ? (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg">
            <p className="font-semibold mb-2">Supabase Not Configured</p>
            <p className="text-sm">The environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing. Please configure them to enable authentication.</p>
          </div>
        ) : (
          <div className="text-center text-slate-400">
            <p>Authentication is available via Supabase.</p>
            <p className="mt-4 text-sm text-amber-500">Note: Actual UI components for login should be rendered here once Supabase Auth UI is installed or custom forms are built.</p>
          </div>
        )}
      </div>
    </div>
  );
}
