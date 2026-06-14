import { useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { User, Mail, Lock, Shield, LogOut, ChevronRight, UserCircle2, KeyRound, Check, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

// Animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export default function ProfilePage() {
  const { user, userRole, signOut, refreshUserRole } = useAuth();

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const [showPersonalEmailForm, setShowPersonalEmailForm] = useState(false);
  const [personalEmail, setPersonalEmail] = useState('');
  const [confirmPersonalEmail, setConfirmPersonalEmail] = useState('');
  const [personalEmailLoading, setPersonalEmailLoading] = useState(false);
  const [personalEmailError, setPersonalEmailError] = useState('');
  const [personalEmailSuccess, setPersonalEmailSuccess] = useState('');
  const [personalEmailSent, setPersonalEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, text: '', color: 'bg-slate-700' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score, text: 'Weak', color: 'bg-red-500' };
    if (score <= 3) return { score, text: 'Good', color: 'bg-yellow-500' };
    return { score, text: 'Strong', color: 'bg-emerald-500' };
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);

    try {
      // 1. Update password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (authError) throw authError;

      // 2. Call Edge Function to log password change
      const { error: logError } = await supabase.functions.invoke('log-password-change', {
        body: {
          person_id: userRole?.personId || null,
          auth_user_id: user.id,
          full_name: userRole?.fullName || null,
          new_password: newPassword,
          note: 'Password updated by member'
        }
      });

      if (logError) {
        console.error("Warning: password logging failed:", logError);
      }

      setPasswordSuccess('Password successfully updated!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLinkPersonalEmail = async (e) => {
    e.preventDefault();
    setPersonalEmailError('');
    setPersonalEmailSuccess('');
    
    if (personalEmail.trim().toLowerCase() !== confirmPersonalEmail.trim().toLowerCase()) {
      setPersonalEmailError('Emails do not match.');
      return;
    }

    if (personalEmail.trim().toLowerCase().endsWith('@churchone.com')) {
      setPersonalEmailError('Please enter a personal email address (Gmail), not a @churchone.com email.');
      return;
    }

    setPersonalEmailLoading(true);

    try {
      // Call secure RPC function to update email directly without verification links
      const { data, error: rpcError } = await supabase.rpc('link_personal_email', {
        p_personal_email: personalEmail.trim().toLowerCase()
      });

      if (rpcError) throw rpcError;

      setPersonalEmailSuccess('Email linked and verified successfully!');
      
      // Refresh AuthContext user role
      await refreshUserRole();

      setTimeout(() => {
        setShowPersonalEmailForm(false);
        setPersonalEmailSuccess('');
      }, 2000);
    } catch (err) {
      setPersonalEmailError(err.message || 'Failed to link email.');
    } finally {
      setPersonalEmailLoading(false);
    }
  };

  // If loading or waiting for auth
  if (!user) return null;

  return (
    // <IonPage>
      // <IonContent className="bg-gradient-dark">
        <div className="bg-gradient-dark min-h-[calc(100vh-4rem)] text-gray-100 px-4 pt-2 pb-8 md:px-8 md:pt-4 md:pb-8 space-y-6 relative overflow-hidden">
          {/* Decorative Dot Pattern */}
          <div className="absolute inset-0 bg-dot-pattern bg-dot-md text-church-blue-500 opacity-[0.03] pointer-events-none"></div>

          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            
            {/* Header */}
            <div>
              <h1 className="text-2xl md:text-4xl font-black text-white leading-tight">
                My <span className="text-church-blue-400">Profile</span>
              </h1>
            </div>
            
            {/* Header / Avatar Section */}
            <motion.div 
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="flex flex-col items-center pt-8 pb-4"
            >
              <div className="relative mb-4">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-slate-800 border-4 border-church-blue-500/20 shadow-xl flex items-center justify-center overflow-hidden">
                  {userRole?.photoUrl ? (
                    <img src={userRole.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle2 size={64} className="text-slate-500" strokeWidth={1} />
                  )}
                </div>
                {/* Online Indicator */}
                <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 w-5 h-5 bg-emerald-500 border-4 border-slate-900 rounded-full"></div>
              </div>
              
              <h1 className="text-3xl font-black bg-gradient-church bg-clip-text text-transparent text-center tracking-tight">
                {userRole?.fullName || 'Anonymous User'}
              </h1>
              <p className="text-church-blue-400 font-bold uppercase tracking-widest text-xs mt-2">
                {userRole?.title || 'No Title'}
              </p>
            </motion.div>

            {/* Profile Details List */}
            <motion.div 
              variants={stagger}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
              {/* Email Section */}
              <motion.div variants={fadeUp} className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-lg flex items-center gap-4 transition-colors hover:bg-slate-800/50">
                <div className="w-12 h-12 rounded-xl bg-church-blue-500/10 flex items-center justify-center shrink-0">
                  <Mail className="text-church-blue-400" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Email Address</p>
                  <p className="text-white font-bold truncate">{user.email}</p>
                </div>
              </motion.div>

              {/* Personal Email Section */}
              <motion.div variants={fadeUp} className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-lg transition-colors hover:bg-slate-800/50">
                {/* Header */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Mail className="text-emerald-400" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Personal Email</p>
                    {userRole?.personalEmail ? (
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <p className="text-white font-bold truncate">{userRole.personalEmail}</p>
                        {userRole?.emailVerified && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-black text-[9px] uppercase tracking-wider">
                            <Check size={10} /> Verified
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-400 font-bold text-sm">Not Linked Yet</p>
                    )}
                  </div>
                  {userRole?.personalEmail && !showPersonalEmailForm && (
                    <button
                      onClick={() => {
                        setPersonalEmail(userRole.personalEmail);
                        setConfirmPersonalEmail(userRole.personalEmail);
                        setShowPersonalEmailForm(true);
                      }}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shrink-0"
                    >
                      Change
                    </button>
                  )}
                </div>

                {/* Form or Warning */}
                {!userRole?.personalEmail && !showPersonalEmailForm ? (
                  <div className="border-t border-white/5 mt-4 pt-4 space-y-4">
                    <div className="p-3.5 bg-church-blue-500/10 border border-church-blue-500/20 rounded-xl text-church-blue-300 text-xs font-semibold leading-relaxed">
                      📢 Starting June 25, a personal email (Gmail) is required to secure your account. Link yours now to ensure uninterrupted access.
                    </div>
                    <button
                      onClick={() => setShowPersonalEmailForm(true)}
                      className="w-full bg-church-blue-600 hover:bg-church-blue-500 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      Link Personal Email
                    </button>
                  </div>
                ) : showPersonalEmailForm ? (
                  <form onSubmit={handleLinkPersonalEmail} className="border-t border-white/5 mt-4 pt-4 space-y-4">
                    {personalEmailError && (
                      <div className="p-3 bg-red-900/50 border border-red-500/30 rounded-xl text-red-300 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{personalEmailError}</span>
                      </div>
                    )}

                    {personalEmailSuccess && (
                      <div className="p-3 bg-emerald-900/50 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
                        <Check size={14} className="shrink-0" />
                        <span>{personalEmailSuccess}</span>
                      </div>
                    )}

                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Personal Email</label>
                          <input
                            type="email"
                            required
                            value={personalEmail}
                            onChange={(e) => setPersonalEmail(e.target.value)}
                            className="w-full bg-black/40 border border-slate-700 text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-church-blue-500/55 focus:border-church-blue-500 transition-all font-medium"
                            placeholder="e.g. name@gmail.com"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Confirm Email</label>
                          <input
                            type="email"
                            required
                            value={confirmPersonalEmail}
                            onChange={(e) => setConfirmPersonalEmail(e.target.value)}
                            className="w-full bg-black/40 border border-slate-700 text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-church-blue-500/55 focus:border-church-blue-500 transition-all font-medium"
                            placeholder="Confirm personal email"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => {
                            setShowPersonalEmailForm(false);
                            setPersonalEmailError('');
                            setPersonalEmailSuccess('');
                          }}
                          className="px-3.5 py-1.5 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-all border border-transparent hover:border-white/5"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={personalEmailLoading}
                          className="flex items-center gap-1.5 px-4 py-2 bg-church-blue-600 hover:bg-church-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-lg transition-all"
                        >
                          {personalEmailLoading ? (
                            <>
                              <Loader2 className="animate-spin" size={13} />
                              Linking...
                            </>
                          ) : (
                            <>
                              <Check size={13} />
                              Link Email
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  </form>
                ) : null}
              </motion.div>

              {/* Password Section */}
              <motion.div variants={fadeUp} className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-lg transition-colors hover:bg-slate-800/50">
                {!showPasswordForm ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Lock className="text-amber-400" size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Password</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          {[...Array(8)].map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/70"></div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowPasswordForm(true)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-600/10 hover:bg-amber-600/25 text-amber-400 border border-amber-500/25 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors w-full sm:w-auto mt-2 sm:mt-0"
                    >
                      <KeyRound size={14} />
                      Change Password
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="flex items-center gap-4 border-b border-white/5 pb-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                        <KeyRound className="text-amber-400" size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">Update Password</h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Choose a secure, strong password</p>
                      </div>
                    </div>

                    {passwordError && (
                      <div className="p-3 bg-red-900/50 border border-red-500/30 rounded-xl text-red-300 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{passwordError}</span>
                      </div>
                    )}

                    {passwordSuccess && (
                      <div className="p-3 bg-emerald-900/50 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
                        <Check size={14} className="shrink-0" />
                        <span>{passwordSuccess}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">New Password</label>
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-black/40 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500 transition-all font-medium"
                          placeholder="••••••••"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Confirm Password</label>
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-black/40 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500 transition-all font-medium"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    {newPassword && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${getPasswordStrength(newPassword).color}`}
                            style={{ width: `${(getPasswordStrength(newPassword).score / 4) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-400">
                          {getPasswordStrength(newPassword).text}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setPasswordError('');
                          setPasswordSuccess('');
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                        className="px-3.5 py-1.5 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-all border border-transparent hover:border-white/5"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={passwordLoading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black rounded-lg text-xs font-black uppercase tracking-wider shadow-lg transition-all"
                      >
                        {passwordLoading ? (
                          <>
                            <Loader2 className="animate-spin" size={13} />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check size={13} />
                            Save Password
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>

              {/* Unit / Hierarchy Section */}
              <motion.div variants={fadeUp} className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-lg flex items-center gap-4 transition-colors hover:bg-slate-800/50">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Shield className="text-emerald-400" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Assigned Unit</p>
                  <p className="text-white font-bold truncate">{userRole?.unitName || 'Not Assigned'}</p>
                  {userRole?.unitType && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-white/5 text-slate-400 border border-white/10 rounded font-bold text-[10px] tracking-wider uppercase">
                      {userRole.unitType} Level
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Admin Section (Only visible to levels <= 3) */}
              {userRole && userRole.level <= 3 && (
                <motion.div variants={fadeUp} className="bg-slate-900/50 backdrop-blur-md border border-church-blue-500/30 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center gap-4 transition-colors hover:bg-slate-800/50">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-church-blue-500/10 flex items-center justify-center shrink-0">
                      <KeyRound className="text-church-blue-400" size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Admin Controls</p>
                      <p className="text-white font-bold">Password Change Log</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">View and audit member passwords</p>
                    </div>
                  </div>
                  <Link 
                    to="/admin/passwords"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-church-blue-600 hover:bg-church-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors w-full sm:w-auto mt-2 sm:mt-0 shadow-lg text-center"
                  >
                    View Logs
                    <ChevronRight size={14} />
                  </Link>
                </motion.div>
              )}
            </motion.div>

            {/* Logout Action */}
            <motion.div variants={fadeUp} initial="hidden" animate="show" className="pt-8">
              <button 
                onClick={signOut}
                className="w-full group relative overflow-hidden bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-2xl p-4 flex items-center justify-center gap-3 transition-all duration-300 shadow-lg"
              >
                <div className="absolute inset-0 w-1/4 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:animate-shine"></div>
                <LogOut size={20} className="relative z-10" />
                <span className="font-black tracking-widest uppercase relative z-10">Sign Out</span>
              </button>
            </motion.div>

          </div>
        </div>
      // </IonContent>
    // </IonPage>
  );
}
