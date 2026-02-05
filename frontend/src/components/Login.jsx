import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, Lock, Mail, Loader2, Sparkles } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/attendance';

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // On success, AuthContext will pick it up, we just navigate
      navigate(from, { replace: true });

    } catch (err) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-church-blue-50 via-church-purple-50 to-church-magenta-50 relative overflow-hidden">
      {/* Decorative Dot Pattern */}
      <div className="absolute inset-0 bg-dot-pattern bg-dot-md text-church-blue-200 opacity-30"></div>
      
      <div className="bg-white border-4 border-church-blue-500 p-8 rounded-3xl w-full max-w-md shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-church flex items-center justify-center mb-4 shadow-lg relative">
                <Lock className="text-white" size={32} />
                <Sparkles className="absolute -top-2 -right-2 text-church-yellow" size={20} />
            </div>
            <h2 className="text-3xl font-black text-gray-900">Welcome Back!</h2>
            <p className="text-church-blue-600 font-semibold">Love Economy Church</p>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-church-coral-100 border-2 border-church-coral-500 rounded-2xl text-church-coral-700 text-sm text-center font-semibold">
                {error}
            </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
            <div>
                <label className="block text-sm font-bold uppercase text-gray-700 tracking-wider mb-2">Email Address</label>
                <div className="relative">
                    <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-gray-50 border-2 border-gray-300 text-gray-900 px-4 py-3 pl-11 rounded-xl focus:outline-none focus:ring-4 focus:ring-church-blue-200 focus:border-church-blue-500 transition-all placeholder:text-gray-400 font-medium"
                        placeholder="you@churchone.com"
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-church-blue-500" size={20} />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold uppercase text-gray-700 tracking-wider mb-2">Password</label>
                <div className="relative">
                    <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-gray-50 border-2 border-gray-300 text-gray-900 px-4 py-3 pl-11 rounded-xl focus:outline-none focus:ring-4 focus:ring-church-blue-200 focus:border-church-blue-500 transition-all placeholder:text-gray-400 font-medium"
                        placeholder="••••••••"
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-church-blue-500" size={20} />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-church hover:opacity-90 text-white font-black py-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6 text-lg border-2 border-church-purple-600"
            >
                {loading ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
                <span>{loading ? 'Signing In...' : 'Sign In'}</span>
            </button>
        </form>
      </div>
    </div>
  );
}
