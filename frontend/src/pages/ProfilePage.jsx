import { IonPage, IonContent } from '@ionic/react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Lock, Shield, LogOut, ChevronRight, UserCircle2, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const { user, userRole, signOut } = useAuth();

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

              {/* Password Section */}
              <motion.div variants={fadeUp} className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center gap-4 transition-colors hover:bg-slate-800/50">
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
                {/* Disabled Change Password Button */}
                <button 
                  disabled
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-slate-400 border border-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider cursor-not-allowed opacity-60 w-full sm:w-auto mt-2 sm:mt-0"
                  title="Password changing is currently disabled"
                >
                  <KeyRound size={14} />
                  Change Password
                </button>
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
