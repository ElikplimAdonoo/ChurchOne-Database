import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * Handles the redirect from Supabase after Google OAuth sign-in.
 * Supabase sets the session from the URL hash via onAuthStateChange.
 * We just wait for the auth state to resolve, then navigate home.
 */
export default function AuthCallbackPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Once auth state resolves and user is available, go home
    if (!loading && user) {
      navigate('/', { replace: true });
    }
    // If loading finishes but still no user, something went wrong — go to login
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-900">
      <Loader2 className="animate-spin text-church-blue-500" size={40} />
      <p className="text-slate-400 font-semibold text-sm tracking-wide">
        Completing sign-in, please wait…
      </p>
    </div>
  );
}
