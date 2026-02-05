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
        <div className="h-screen w-screen bg-gradient-dark text-gray-100 font-sans selection:bg-church-blue-400/30 flex flex-col overflow-hidden relative">
          {/* Decorative Dot Pattern Overlay */}
          <div className="absolute inset-0 bg-dot-pattern bg-dot-md text-church-blue-500 opacity-10 pointer-events-none z-0"></div>
          
          <div className="relative z-10 flex-1 flex flex-col overflow-hidden h-full">
            <Navigation />

            {/* Main Content Area: Fills remaining space */}
            <main className="flex-1 relative bg-transparent overflow-hidden flex flex-col">
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
        </div>
      </Router>
    </AuthProvider>
  )
}

// NAVIGATION COMPONENT
function Navigation() {
  return (
    // Changed from fixed to relative (flex item), but kept z-index for shadow/layering
    <nav className="relative z-50 bg-black/60 backdrop-blur-md border-b border-church-blue-500/30 shadow-2xl shrink-0">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-church flex items-center justify-center shadow-lg">
            <Activity className="text-white" size={24} />
          </div>
          <span className="font-black text-xl tracking-tight bg-gradient-church bg-clip-text text-transparent">
            ChurchOne
          </span>
        </div>

        <div className="flex items-center gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
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
        flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200
        ${isActive
          ? 'bg-gradient-church text-white shadow-lg'
          : 'text-gray-400 hover:text-church-blue-400 hover:bg-white/5'
        }
      `}
    >
      {icon}
      <span className="hidden md:block">{label}</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard label="Total Members" value={stats.people} icon={<Users size={20} />} color="blue" />
        <StatCard label="Active Units" value={stats.units} icon={<Database size={20} />} color="emerald" />
        <StatCard label="System Status" value="Online" icon={<Activity size={20} />} color="yellow" />
      </div>

      {/* Hierarchy Tree */}
      <div className="bg-slate-900/50 border-2 border-church-blue-500/30 rounded-3xl p-1 shadow-xl backdrop-blur-sm">
        <HierarchyTree />
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }) {
  const themes = {
    blue: 'border-church-blue-500/40 text-church-blue-400 bg-church-blue-500/5',
    emerald: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/5',
    yellow: 'border-yellow-500/40 text-yellow-400 bg-yellow-500/5',
    purple: 'border-purple-500/40 text-purple-400 bg-purple-500/5',
    coral: 'border-coral-500/40 text-coral-400 bg-coral-500/5',
  }

  return (
    <div className={`p-5 px-6 rounded-2xl border-2 ${themes[color] || themes.blue} shadow-xl backdrop-blur-md flex flex-col gap-3 transition-all hover:scale-[1.02] hover:bg-opacity-10`}>
      <div className="flex items-center gap-2.5">
        <div className="shrink-0">{icon}</div>
        <span className="text-[10px] font-black uppercase tracking-[0.15em] opacity-80">{label}</span>
      </div>
      <span className="text-3xl font-black text-white tracking-tight">{value}</span>
    </div>
  )
}

export default App
