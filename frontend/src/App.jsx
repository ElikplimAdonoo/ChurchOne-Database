import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Activity, Database, Users, LayoutDashboard, List, Menu, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
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
  const [stats, setStats] = useState({ 
    people: 0, 
    units: 0, 
    assigned: 0, 
    leaders: 0 
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        // 1. Total People
        const { count: peopleCount } = await supabase.from('people').select('*', { count: 'exact', head: true })
        
        // 2. Total Units
        const { count: unitsCount } = await supabase.from('organizational_units').select('*', { count: 'exact', head: true })
        
        // 3. Assigned People (Unique people in position_assignments)
        // Note: distinct on person_id is more accurate for "placement rate"
        const { data: assignments } = await supabase
          .from('position_assignments')
          .select('person_id')
          .eq('is_active', true)
        
        const uniqueAssigned = new Set(assignments?.map(a => a.person_id)).size

        // 4. Leaders (People in specific leadership roles - logic simplified for dashboard)
        // We look for assignments where position title doesn't contain 'member' or 'shepherd' if that's the convention
        // Actually, let's just count people assigned to ANY position for now as "Engaged"
        // Better: count people in organizational_units.leaders arrays if we had them or query positions
        const { count: leaderCount } = await supabase
          .from('position_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .not('position_id', 'is', null) // Simplified proxy for leadership for now

        setStats({ 
          people: peopleCount || 0, 
          units: unitsCount || 0, 
          assigned: uniqueAssigned || 0,
          leaders: uniqueAssigned // Using uniqueAssigned as a proxy for "Engaged Members"
        })
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const placementRate = stats.people > 0 ? Math.round((stats.assigned / stats.people) * 100) : 0

  return (
    <div className="space-y-8">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Members" 
          value={stats.people} 
          icon={<Users size={20} />} 
          color="blue" 
          subText="Registered in system"
        />
        <StatCard 
          label="Active Units" 
          value={stats.units} 
          icon={<LayoutDashboard size={20} />} 
          color="emerald" 
          subText="Current hierarchy depth"
        />
        <StatCard 
          label="Placement Rate" 
          value={`${placementRate}%`} 
          icon={<CheckCircle2 size={20} />} 
          color="yellow" 
          subText={`${stats.assigned} members assigned`}
        />
        <StatCard 
          label="System Health" 
          value="Optimal" 
          icon={<Activity size={20} />} 
          color="purple" 
          subText="All services running"
        />
      </div>

      {/* Hierarchy Tree Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/50 border-2 border-church-blue-500/30 rounded-3xl p-1 shadow-2xl backdrop-blur-md overflow-hidden"
      >
        <div className="bg-slate-950/40 p-1 rounded-[1.4rem]">
            <HierarchyTree />
        </div>
      </motion.div>
    </div>
  )
}

function StatCard({ label, value, icon, color, subText }) {
  const themes = {
    blue: 'border-church-blue-500/40 text-church-blue-400 bg-church-blue-500/10 shadow-church-blue-500/10',
    emerald: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10 shadow-emerald-500/10',
    yellow: 'border-amber-500/40 text-amber-400 bg-amber-500/10 shadow-amber-500/10',
    purple: 'border-purple-500/40 text-purple-400 bg-purple-500/10 shadow-purple-500/10',
  }

  const iconGradients = {
    blue: 'bg-church-blue-500/20 text-church-blue-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    yellow: 'bg-amber-500/20 text-amber-400',
    purple: 'bg-purple-500/20 text-purple-400',
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className={`relative p-6 rounded-3xl border-2 ${themes[color] || themes.blue} shadow-2xl backdrop-blur-xl flex flex-col gap-4 transition-all overflow-hidden group`}
    >
      {/* Decorative Background Glow */}
      <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity ${iconGradients[color]}`}></div>

      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-2xl ${iconGradients[color]} shadow-inner`}>
           {icon}
        </div>
        <div className="flex flex-col items-end">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{label}</span>
             <span className="text-2xl font-black text-white tracking-tighter mt-1">{value}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-2 pt-4 border-t border-white/5">
        <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{subText}</span>
      </div>
    </motion.div>
  )
}

export default App
