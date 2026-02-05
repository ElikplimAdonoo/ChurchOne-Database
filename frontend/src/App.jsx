import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Activity, Database, Users, LayoutDashboard, List, Menu, CheckCircle2 } from 'lucide-react'
import HierarchyTree from './components/HierarchyTree'
import PeopleDirectory from './components/PeopleDirectory'
import HierarchyMindMap from './components/HierarchyMindMap'
import AttendancePage from './components/attendance/AttendancePage'
import Login from './components/Login'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom'

function App() {
  return (
    <AuthProvider>
      <Router>
        {/* App Container: Fixed Screen Size, Flex Column */}
        <div className="h-screen w-screen bg-slate-900 text-white font-sans selection:bg-emerald-500/30 flex flex-col overflow-hidden">
          <Navigation />

        {/* Main Content Area: Fills remaining space */}
        <main className="flex-1 relative bg-slate-900/50">
          <Routes>
            {/* Dashboard: Scrollable Overlay */}
            <Route path="/" element={
              <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                  <Dashboard />
                </div>
              </div>
            } />

            {/* Directory: Scrollable Overlay */}
            <Route path="/directory" element={
              <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                  <PeopleDirectory />
                </div>
              </div>
            } />

            {/* MindMap: Fixed Full Fill (No Scroll) */}
            <Route path="/mindmap" element={
              <div className="absolute inset-0 w-full h-full">
                <HierarchyMindMap />
              </div>
            } />

            {/* Login Page */}
            <Route path="/login" element={<Login />} />

            {/* Attendance Page (Protected) */}
            <Route path="/attendance" element={
              <ProtectedRoute>
                <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                  <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                    <AttendancePage />
                  </div>
                </div>
              </ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
    </Router>
    </AuthProvider>
  )
}

// NAVIGATION COMPONENT
function Navigation() {
  return (
    // Changed from fixed to relative (flex item), but kept z-index for shadow/layering
    <nav className="relative z-50 bg-slate-900 border-b border-slate-700/50 shadow-xl shrink-0">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
            <Activity className="text-white" size={20} />
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            ChurchOne Database
          </span>
        </div>

        <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
          <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Structure" />
          <NavItem to="/directory" icon={<Users size={18} />} label="Directory" />
          <NavItem to="/mindmap" icon={<List size={18} />} label="Graph" />
          <NavItem to="/attendance" icon={<CheckCircle2 size={18} />} label="Attendance" />
        </div>
      </div>
    </nav>
  )
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `
        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
        ${isActive
          ? 'bg-slate-700 text-white shadow-lg shadow-black/20'
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  )
}

// DASHBOARD / HIERARCHY PAGE
function Dashboard() {
  const [stats, setStats] = useState({ people: 0, units: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const { count: peopleCount } = await supabase.from('people').select('*', { count: 'exact', head: true })
      const { count: unitsCount } = await supabase.from('organizational_units').select('*', { count: 'exact', head: true })
      setStats({ people: peopleCount || 0, units: unitsCount || 0 })
      setLoading(false)
    }
    fetchStats()
  }, [])

  return (
    <div className="space-y-8">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Members" value={stats.people} icon={<Users size={20} />} color="blue" />
        <StatCard label="Active Units" value={stats.units} icon={<Database size={20} />} color="purple" />
        <StatCard label="System Status" value="Online" icon={<Activity size={20} />} color="emerald" />
      </div>

      {/* Hierarchy Tree */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-1">
        <HierarchyTree />
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  }

  return (
    <div className={`p-4 rounded-2xl border ${colors[color]} backdrop-blur-sm flex flex-col gap-1`}>
      <div className="flex items-center gap-2 opacity-80">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-2xl font-bold text-white">{value}</span>
    </div>
  )
}

export default App
