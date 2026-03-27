import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, Lock, Mail, Loader2 } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-dark relative overflow-hidden">
      {/* Decorative Dot Pattern */}
      <div className="absolute inset-0 bg-dot-pattern bg-dot-md text-church-blue-500 opacity-10"></div>
      
      <div className="bg-black/60 backdrop-blur-xl border-2 border-church-blue-500/30 p-8 rounded-3xl w-full max-w-md shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-4 shadow-2xl overflow-hidden border-2 border-church-blue-500/30 bg-black/30 backdrop-blur-sm relative">
                <img
                    src="/lec-shield-v2.PNG"
                    alt="LEC Logo"
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                        // Fallback to icon if logo fails to load
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                    }}
                />
                <div className="hidden w-full h-full bg-gradient-church items-center justify-center">
                    <Lock className="text-white" size={32} />
                </div>
            </div>
            <h2 className="text-3xl font-black text-white">Welcome Back!</h2>
            <p className="text-church-blue-400 font-semibold text-sm mt-1">Love Economy Church · ChurchOne</p>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-900/50 border-2 border-red-500/50 rounded-2xl text-red-300 text-sm text-center font-semibold">
                {error}
            </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
            <div>
                <label className="block text-sm font-bold uppercase text-gray-400 tracking-wider mb-2">Email Address</label>
                <div className="relative">
                    <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-black/50 border-2 border-gray-700 text-white px-4 py-3 pl-11 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-blue-500/50 focus:border-church-blue-500 transition-all placeholder:text-gray-500 font-medium"
                        placeholder="you@churchone.com"
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-church-blue-400" size={20} />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold uppercase text-gray-400 tracking-wider mb-2">Password</label>
                <div className="relative">
                    <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black/50 border-2 border-gray-700 text-white px-4 py-3 pl-11 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-blue-500/50 focus:border-church-blue-500 transition-all placeholder:text-gray-500 font-medium"
                        placeholder="••••••••"
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-church-blue-400" size={20} />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-church hover:opacity-90 text-white font-black py-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6 text-lg border-2 border-church-blue-600"
            >
                {loading ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
                <span>{loading ? 'Signing In...' : 'Sign In'}</span>
            </button>
        </form>
      </div>
    </div>
  );
}
