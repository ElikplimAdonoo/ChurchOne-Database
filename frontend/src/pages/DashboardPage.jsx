import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { fetchPeople } from '../services/peopleService'
import { Users, CalendarCheck, Clock, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import HierarchyTree from '../components/HierarchyTree'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useAnimatedCounter } from '../hooks/useAnimatedCounter'

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } }
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
}

export default function DashboardPage() {
  const { user, userRole, getManagedUnits } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ 
    members: 0, 
    activeCells: 0,
    assigned: 0,
    totalUnits: 0,
    unitBreakdown: ''
  })
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    async function fetchStats() {
      try {
        const managedUnits = user ? await getManagedUnits() : 'ALL'
        
        if (managedUnits !== 'ALL' && managedUnits.size === 0) {
            setStats({ 
              members: 0, 
              activeCells: 0, 
              assigned: 0, 
              totalUnits: 0, 
              unitBreakdown: '0 Zones · 0 MCs · 0 Buscentas · 0 Cells' 
            })
            setLoading(false)
            return
        }

        const unitIdsArray = managedUnits === 'ALL' ? null : Array.from(managedUnits)

        const allPeople = await fetchPeople()
        let memberCount = 0;
        
        if (unitIdsArray) {
            const unitIdsSet = new Set(unitIdsArray);
            memberCount = allPeople.filter(p => p.status === 'Active' && unitIdsSet.has(p.unit_id)).length;
        } else {
            memberCount = allPeople.filter(p => p.status === 'Active').length;
        }

        let unitsQuery = supabase
          .from('organizational_units')
          .select('id, name, unit_type')

        if (unitIdsArray) unitsQuery = unitsQuery.in('id', unitIdsArray)
        const { data: units } = await unitsQuery

        let assignsQuery = supabase
          .from('position_assignments')
          .select('unit_id, person_id')
          .eq('is_active', true)

        if (unitIdsArray) assignsQuery = assignsQuery.in('unit_id', unitIdsArray)
        const { data: assignments } = await assignsQuery

        const totalUnits = units?.length || 0
        const cells = units?.filter(u => u.unit_type === 'CELL') || []
        
        const zonesCount = units?.filter(u => u.unit_type === 'ZONE').length || 0
        const mcsCount = units?.filter(u => u.unit_type === 'MC').length || 0
        const buscentasCount = units?.filter(u => u.unit_type === 'BUSCENTA').length || 0
        const cellsCount = cells.length
        
        const unitBreakdown = `${zonesCount} Zones · ${mcsCount} MCs · ${buscentasCount} Buscentas · ${cellsCount} Cells`

        const assignedUnitIds = new Set(assignments?.map(a => a.unit_id) || [])
        const cellsWithLeaders = cells.filter(c => assignedUnitIds.has(c.id)).length
        const uniquePersonIds = new Set(assignments?.map(a => a.person_id) || [])
        const uniqueAssigned = uniquePersonIds.size

        setStats({ 
          members: memberCount || 0, 
          activeCells: cellsWithLeaders,
          assigned: uniqueAssigned,
          totalUnits,
          unitBreakdown
        })
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [location.pathname, getManagedUnits])

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }, [])

  const dashboardTitle = userRole?.unitName || 'ChurchOne'

  return (
    <div className="space-y-10 animate-in fade-in duration-500">

      {/* ── Command Center Header ── */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] mb-1">
            {greeting}
          </p>
          <h1 className="text-2xl md:text-4xl font-black text-white leading-tight">
            {dashboardTitle} <span className="text-slate-500 font-bold">Dashboard</span>
          </h1>
          <div className="flex items-center gap-2 mt-2 text-slate-500">
           
            <span className="text-[11px] font-semibold">
              Here is what is happening in your Church
            </span>
          </div>
        </div>

  
      </motion.div>

      {/* ── Stats Cards ── */}
      <motion.div 
        variants={stagger} 
        initial="hidden" 
        animate="show" 
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4"
      >
        <motion.div variants={fadeUp}>
          <StatCard 
            label="My Members" 
            value={stats.members} 
            icon={<Users size={20} />} 
            color="blue" 
            subText="Registered in church"
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard 
            label="Total Units" 
            value={stats.totalUnits} 
            icon={<CalendarCheck size={20} />} 
            color="amber" 
            subText={stats.unitBreakdown || "Across all levels"}
          />
        </motion.div>
      </motion.div>

      {/* ── Hierarchy Tree Card ── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-1 shadow-xl overflow-hidden"
      >
        <div className="bg-slate-950/40 p-1 rounded-xl">
            <HierarchyTree />
        </div>
      </motion.div>
    </div>
  )
}

function StatCard({ label, value, icon, color, subText }) {
  const animatedValue = useAnimatedCounter(value)

  const iconBg = {
    blue: 'bg-church-blue-500/10 text-church-blue-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    red: 'bg-red-500/10 text-red-400',
    violet: 'bg-church-purple-500/10 text-church-purple-400',
  }

  return (
    <div className="p-4 rounded-xl bg-slate-800/50 flex flex-col gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/20 cursor-default group">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${iconBg[color]} transition-transform duration-300 group-hover:scale-110`}>
           {icon}
        </div>
        <span className="text-2xl font-black text-white tabular-nums">{animatedValue}</span>
      </div>
      
      <div>
        <p className="text-xs font-semibold text-slate-300">{label}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">{subText}</p>
      </div>
    </div>
  )
}
