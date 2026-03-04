import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Users, Church, CalendarCheck, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import HierarchyTree from '../components/HierarchyTree'

export default function DashboardPage() {
  const [stats, setStats] = useState({ 
    members: 0, 
    activeCells: 0,
    assigned: 0,
    totalUnits: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        // Total registered members
        const { count: memberCount } = await supabase
          .from('people')
          .select('*', { count: 'exact', head: true })

        // All organizational units
        const { data: units } = await supabase
          .from('organizational_units')
          .select('id, name, unit_type')

        // Active position assignments
        const { data: assignments } = await supabase
          .from('position_assignments')
          .select('unit_id, person_id')
          .eq('is_active', true)

        const totalUnits = units?.length || 0
        const cells = units?.filter(u => u.unit_type === 'CELL') || []
        const assignedUnitIds = new Set(assignments?.map(a => a.unit_id) || [])
        const cellsWithLeaders = cells.filter(c => assignedUnitIds.has(c.id)).length
        const uniqueAssigned = new Set(assignments?.map(a => a.person_id) || []).size

        setStats({ 
          members: memberCount || 0, 
          activeCells: cellsWithLeaders,
          assigned: uniqueAssigned,
          totalUnits
        })
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-black bg-gradient-church bg-clip-text text-transparent">
          Welcome Home
        </h1>
        <p className="text-slate-400 mt-1 text-sm font-medium">
          Here's what's happening in your church
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="My Members" 
          value={stats.members} 
          icon={<Users size={20} />} 
          color="blue" 
          subText="Registered in church"
        />
        <StatCard 
          label="Active Cells" 
          value={stats.activeCells} 
          icon={<Church size={20} />} 
          color="emerald" 
          subText="Cells with shepherds"
        />
        <StatCard 
          label="Total Units" 
          value={stats.totalUnits} 
          icon={<CalendarCheck size={20} />} 
          color="amber" 
          subText="Across all levels"
        />
        <StatCard 
          label="Placement Rate" 
          value={`${stats.members > 0 ? Math.round((stats.assigned / stats.members) * 100) : 0}%`} 
          icon={<CheckCircle2 size={20} />} 
          color="amber" 
          subText={`${stats.assigned} members assigned`}
        />
      </div>

      {/* Hierarchy Tree Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
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
  const iconBg = {
    blue: 'bg-church-blue-500/10 text-church-blue-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    red: 'bg-red-500/10 text-red-400',
  }

  return (
    <div className={`p-4 rounded-lg bg-slate-800/50 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${iconBg[color]}`}>
           {icon}
        </div>
        <span className="text-2xl font-black text-white">{value}</span>
      </div>
      
      <div>
        <p className="text-xs font-semibold text-slate-300">{label}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">{subText}</p>
      </div>
    </div>
  )
}
