import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, BarChart3, CheckCircle2, AlertCircle } from 'lucide-react';
import AttendanceMarking from './AttendanceMarking';
import AttendanceAnalytics from './AttendanceAnalytics';

export default function AttendancePage() {
  const { user, userRole, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('marking');

  // If user is logged in but hasn't been linked to a person/role yet
  if (!userRole) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                <AlertCircle className="text-yellow-500" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white">Access Pending</h2>
            <p className="text-slate-400 max-w-md">
                Your account ({user.email}) is authenticated, but not linked to any specific role or unit in the organization yet.
            </p>
            <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">
                Please contact an administrator to link your profile.
            </p>
            <button 
                onClick={signOut}
                className="mt-4 px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-medium transition-colors border border-slate-700"
            >
                Sign Out
            </button>
        </div>
    );
  }

  return (
    <div className="bg-slate-900 min-h-[calc(100vh-4rem)] text-white p-4 md:p-8 space-y-6">
      
      {/* Header & User Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
            Attendance Tracking
          </h1>
          <p className="text-slate-400 mt-1">
            Welcome, <span className="text-emerald-400 font-medium">{userRole.fullName}</span>
          </p>
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
                <div className="text-sm font-bold text-white">{userRole.title}</div>
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">{userRole.unitName}</div>
            </div>
            {userRole.photoUrl && (
                <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-slate-700 shadow-lg">
                    <img src={userRole.photoUrl} alt={userRole.fullName} className="w-full h-full object-cover" />
                </div>
            )}
            <button 
                onClick={signOut}
                className="px-4 py-2 bg-slate-800 hover:bg-red-500/10 hover:text-red-400 text-slate-400 rounded-lg text-sm font-medium transition-all ml-2"
            >
                Log Out
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl w-fit border border-slate-700/50">
        <button
          onClick={() => setActiveTab('marking')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'marking' 
              ? 'bg-emerald-500/20 text-emerald-400 shadow-sm border border-emerald-500/20' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <CheckCircle2 size={18} />
          Mark Attendance
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'analytics' 
              ? 'bg-blue-500/20 text-blue-400 shadow-sm border border-blue-500/20' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BarChart3 size={18} />
          Analytics & Reports
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 min-h-[500px]">
        {activeTab === 'marking' && (
          <AttendanceMarking currentRole={userRole} />
        )}
        {activeTab === 'analytics' && (
          <AttendanceAnalytics currentRole={userRole} />
        )}
      </div>
    </div>
  );
}
