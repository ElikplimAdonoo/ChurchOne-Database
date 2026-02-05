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
    <div className="bg-gradient-to-br from-white to-church-blue-50 min-h-[calc(100vh-4rem)] text-gray-900 p-4 md:p-8 space-y-6">
      
      {/* Header & User Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-church-blue-500 pb-6">
        <div>
          <h1 className="text-4xl font-black bg-gradient-church bg-clip-text text-transparent">
            Attendance Tracking
          </h1>
          <p className="text-gray-600 mt-1 font-medium">
            Welcome, <span className="text-church-blue-600 font-bold">{userRole.fullName}</span>
          </p>
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-4">
            <div className="text-left md:text-right block">
                <div className="text-sm font-black text-gray-900">{userRole.title}</div>
                <div className="text-xs text-church-blue-600 font-bold uppercase tracking-wider">{userRole.unitName}</div>
            </div>
            {userRole.photoUrl && (
                <div className="w-14 h-14 rounded-xl overflow-hidden border-4 border-church-blue-500 shadow-lg">
                    <img src={userRole.photoUrl} alt={userRole.fullName} className="w-full h-full object-cover" />
                </div>
            )}
            <button 
                onClick={signOut}
                className="px-4 py-2 bg-white hover:bg-church-coral-100 hover:text-church-coral-600 text-gray-700 rounded-xl text-sm font-bold transition-all border-2 border-gray-300 hover:border-church-coral-500 flex items-center gap-2"
            >
                <LogOut size={16} />
                <span className="hidden md:inline">Log Out</span>
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-1.5 rounded-xl w-fit border-4 border-church-blue-500 shadow-lg">
        <button
          onClick={() => setActiveTab('marking')}
          className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-black transition-all ${
            activeTab === 'marking' 
              ? 'bg-gradient-church text-white shadow-lg' 
              : 'text-gray-700 hover:text-church-blue-600 hover:bg-church-blue-50'
          }`}
        >
          <CheckCircle2 size={20} />
          Mark Attendance
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-black transition-all ${
            activeTab === 'analytics' 
              ? 'bg-gradient-to-r from-church-purple to-church-magenta text-white shadow-lg' 
              : 'text-gray-700 hover:text-church-purple-600 hover:bg-church-purple-50'
          }`}
        >
          <BarChart3 size={20} />
          Analytics & Reports
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-white border-4 border-church-blue-500 rounded-3xl p-6 min-h-[500px] shadow-xl">
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
