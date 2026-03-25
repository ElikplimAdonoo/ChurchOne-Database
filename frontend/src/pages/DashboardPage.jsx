import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchPeople } from '../services/peopleService'
import { Users, CalendarCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import HierarchyTree from '../components/HierarchyTree'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function DashboardPage() {
  const { user, getManagedUnits } = useAuth()
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
        // If guest (no user), fetch all stats globally. Otherwise, use scoped permissions.
        const managedUnits = user ? await getManagedUnits() : 'ALL'
        
        // Quick exit if not admin and has zero managed units
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

        // Use the same fetchPeople service the Directory uses so counts are identical
        const allPeople = await fetchPeople()
        let memberCount = 0;
        
        if (unitIdsArray) {
            const unitIdsSet = new Set(unitIdsArray);
            memberCount = allPeople.filter(p => p.status === 'Active' && unitIdsSet.has(p.unit_id)).length;
        } else {
            memberCount = allPeople.filter(p => p.status === 'Active').length;
        }

        // All organizational units in jurisdiction
        let unitsQuery = supabase
          .from('organizational_units')
          .select('id, name, unit_type')

        if (unitIdsArray) unitsQuery = unitsQuery.in('id', unitIdsArray)
        const { data: units } = await unitsQuery

        // Active position assignments in jurisdiction
        let assignsQuery = supabase
          .from('position_assignments')
          .select('unit_id, person_id')
          .eq('is_active', true)

        if (unitIdsArray) assignsQuery = assignsQuery.in('unit_id', unitIdsArray)
        const { data: assignments } = await assignsQuery

        const totalUnits = units?.length || 0
        const cells = units?.filter(u => u.unit_type === 'CELL') || []
        
        // Breakdown calculations
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Banner — matches reference design */}
      <div>
  {/* Top header */}
  <div className="bg-[#0A0F1F] px-6 py-6 flex items-center justify-center gap-4 md:gap-5 border-b border-[#18488E]/40">
    
    <img 
      src="/lec-shield-v2.png" 
      alt="LEC Shield" 
      className="w-14 h-14 md:w-16 md:h-16 object-contain" 
    />

    {/* Divider */}
    <div className="w-px h-14 md:h-16 bg-[#18488E]/60"></div>

  <div className="text-left">

            <p className="text-white font-black text-sm tracking-wider uppercase leading-tight">Love Economy</p>

            <p className="text-white font-black text-sm tracking-wider uppercase leading-tight">Church</p>


          </div>
  </div>

  {/* Blue band */}
<div className="bg-[#1D4ED8] px-8 py-5 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 relative overflow-hidden">
  
  {/* Glow effect - adjusted color for better contrast against lighter blue */}
  <div className="absolute inset-0 bg-gradient-to-r from-blue-300/0 via-blue-200/20 to-blue-300/0 opacity-60"></div>

  <span className="text-white/70 text-xs md:text-sm font-bold uppercase tracking-[0.4em] relative z-10">
    Church One
  </span>

  <h1 className="text-white text-3xl md:text-4xl font-black relative z-10">
    Structure
  </h1>
</div>
</div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard 
          label="My Members" 
          value={stats.members} 
          icon={<Users size={20} />} 
          color="blue" 
          subText="Registered in church"
        />
        <StatCard 
          label="Total Units" 
          value={stats.totalUnits} 
          icon={<CalendarCheck size={20} />} 
          color="amber" 
          subText={stats.unitBreakdown || "Across all levels"}
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
    violet: 'bg-church-purple-500/10 text-church-purple-400',
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
