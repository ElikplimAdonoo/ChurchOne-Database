import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Loader2, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EmailGatePage() {
  const { user, userRole, signOut, refreshUserRole, EMAIL_GATE_ACTIVATION_DATE } = useAuth();
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLinkEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      setError('Emails do not match.');
      setLoading(false);
      return;
    }

    if (email.trim().toLowerCase().endsWith('@churchone.com')) {
      setError('Please enter a personal email address (Gmail), not a @churchone.com email.');
      setLoading(false);
      return;
    }

    try {
      // Call secure RPC function to update email directly without verification links
      const { data, error: rpcError } = await supabase.rpc('link_personal_email', {
        p_personal_email: email.trim().toLowerCase()
      });

      if (rpcError) throw rpcError;

      // Refresh AuthContext user role so App.jsx redirects the user into the app
      await refreshUserRole();
    } catch (err) {
      setError(err.message || 'Failed to link email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-dark relative overflow-hidden">
      {/* Decorative Dot Pattern */}
      <div className="absolute inset-0 bg-dot-pattern bg-dot-md text-church-blue-500 opacity-[0.03]"></div>
      
      <div className="bg-black/60 backdrop-blur-xl border-2 border-church-blue-500/30 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative z-10">
        
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-church-blue-500 animate-pulse"></span>
            <span className="text-xs font-black uppercase text-church-blue-400 tracking-[0.2em]">Security Upgrade</span>
          </div>
          <button 
            onClick={signOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xs font-bold border border-white/10"
          >
            <LogOut size={13} />
            Sign Out
          </button>
        </div>

        <motion.div
          key="gate-form"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-church-blue-500/10 border border-church-blue-500/20 flex items-center justify-center mx-auto mb-4">
              <Mail className="text-church-blue-400" size={28} />
            </div>
            <h2 className="text-2xl font-black text-white">Link Personal Email</h2>
            <p className="text-slate-400 text-sm mt-2 font-medium">
              Hi <span className="text-white font-bold">{userRole?.fullName || 'there'}</span>. Starting {(() => { const d = new Date(EMAIL_GATE_ACTIVATION_DATE + 'T00:00:00'); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); })()}, ChurchOne requires a personal email to secure your account.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border-2 border-red-500/50 rounded-2xl text-red-300 text-sm text-center font-semibold flex items-center gap-2 justify-center">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLinkEmail} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                Personal Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border-2 border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-blue-500/50 focus:border-church-blue-500 transition-all placeholder:text-slate-600 font-medium"
                placeholder="e.g. yourname@gmail.com"
              />
              <p className="text-[10px] text-slate-500 mt-1.5 font-medium leading-relaxed">
                Use your Gmail address. Do NOT use a @churchone.com email.
              </p>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                Confirm Email Address
              </label>
              <input
                type="email"
                required
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="w-full bg-black/50 border-2 border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-blue-500/50 focus:border-church-blue-500 transition-all placeholder:text-slate-600 font-medium"
                placeholder="Confirm personal email address"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-church hover:opacity-90 text-white font-black py-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6 text-base border border-church-blue-600"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
              <span>{loading ? 'Linking & Verifying...' : 'Link & Verify Email Address'}</span>
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
