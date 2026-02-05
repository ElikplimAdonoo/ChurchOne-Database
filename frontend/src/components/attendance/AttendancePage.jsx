import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, BarChart3, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import AttendanceMarking from './AttendanceMarking';
import AttendanceAnalytics from './AttendanceAnalytics';

export default function AttendancePage() {
  const { user, userRole, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('marking');

  // If user is logged in but hasn't been linked to a person/role yet
  if (!userRole) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 p-8">
            <div className="w-20 h-20 rounded-full bg-church-yellow-100 flex items-center justify-center border-4 border-church-yellow-500">
                <AlertCircle className="text-church-yellow-600" size={40} />
            </div>
            <h2 className="text-3xl font-black text-gray-900">Access Pending</h2>
            <p className="text-gray-600 max-w-md font-medium">
                Your account ({user.email}) is authenticated, but not linked to any specific role or unit in the organization yet.
            </p>
            <p className="text-sm text-church-blue-600 uppercase font-bold tracking-wider">
                Please contact an administrator to link your profile.
            </p>
            <button 
                onClick={signOut}
                className="mt-4 px-6 py-3 bg-white hover:bg-gray-50 rounded-xl text-gray-900 font-bold transition-colors border-2 border-gray-300 flex items-center gap-2"
            >
                <LogOut size={20} />
                Sign Out
            </button>
        </div>
    );
  }

  return (
    <div className="bg-gradient-dark min-h-[calc(100vh-4rem)] text-gray-100 p-4 md:p-8 space-y-6 relative overflow-hidden">
      {/* Decorative Dot Pattern */}
      <div className="absolute inset-0 bg-dot-pattern bg-dot-md text-church-blue-500 opacity-10 pointer-events-none"></div>

      <div className="relative z-10 space-y-6">
      
      {/* Header & User Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-church-blue-500/30 pb-6">
        <div>
          <h1 className="text-4xl font-black bg-gradient-church bg-clip-text text-transparent">
            Attendance Tracking
          </h1>
          <p className="text-gray-400 mt-1 font-medium">
            Welcome, <span className="text-church-blue-400 font-bold">{userRole.fullName}</span>
          </p>
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-4">
            <div className="text-left md:text-right block">
                <div className="text-sm font-black text-white">{userRole.title}</div>
                <div className="text-xs text-church-blue-400 font-bold uppercase tracking-wider">{userRole.unitName}</div>
            </div>
            {userRole.photoUrl && (
                <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-church-blue-500/50 shadow-lg">
                    <img src={userRole.photoUrl} alt={userRole.fullName} className="w-full h-full object-cover" />
                </div>
            )}
            <button 
                onClick={signOut}
                className="px-4 py-2 bg-black/50 hover:bg-red-900/50 hover:text-red-300 text-gray-300 rounded-xl text-sm font-bold transition-all border-2 border-gray-700 hover:border-red-500/50 flex items-center gap-2"
            >
                <LogOut size={16} />
                <span className="hidden md:inline">Log Out</span>
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-800/50 p-1.5 rounded-xl w-fit border-2 border-church-blue-500/50 shadow-lg backdrop-blur-sm">
        <button
          onClick={() => setActiveTab('marking')}
          className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-black transition-all ${
            activeTab === 'marking' 
              ? 'bg-gradient-church text-white shadow-lg' 
              : 'text-slate-400 hover:text-church-blue-400 hover:bg-slate-700'
          }`}
        >
          <CheckCircle2 size={20} />
          Mark Attendance
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-black transition-all ${
            activeTab === 'analytics' 
              ? 'bg-gradient-church text-white shadow-lg' 
              : 'text-slate-400 hover:text-church-blue-400 hover:bg-slate-700'
          }`}
        >
          <BarChart3 size={20} />
          Analytics & Reports
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-slate-900/50 border-2 border-church-blue-500/30 rounded-3xl p-6 min-h-[500px] shadow-xl backdrop-blur-sm">
        {activeTab === 'marking' && (
          <AttendanceMarking currentRole={userRole} />
        )}
        {activeTab === 'analytics' && (
          <AttendanceAnalytics currentRole={userRole} />
        )}
      </div>
      </div>
    </div>
  );
}
