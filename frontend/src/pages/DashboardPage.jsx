import { IonPage, IonContent } from '@ionic/react';
import { useEffect, useState, useMemo, useRef } from 'react'
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
    membersBreakdown: [],
    activeCells: 0,
    assigned: 0,
    totalUnits: 0,
    unitBreakdown: [],
    attendanceRate: 0,
    attendanceTrend: 0,
    firstTimers: 0
  })
  const [loading, setLoading] = useState(true)
  const [focusMembersTrigger, setFocusMembersTrigger] = useState(0)
  const [highlightTree, setHighlightTree] = useState(false)
  const treeContainerRef = useRef(null)
  const location = useLocation()

  const handleFocusMembers = () => {
    setFocusMembersTrigger(Date.now())
    setHighlightTree(true)
    setTimeout(() => setHighlightTree(false), 2000)
    
    if (treeContainerRef.current) {
        const yOffset = -80; // Account for any fixed headers
        const element = treeContainerRef.current;
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  useEffect(() => {
    async function fetchStats() {
      try {
        const managedUnits = user ? await getManagedUnits() : 'ALL'
        
        if (managedUnits !== 'ALL' && managedUnits.size === 0) {
            setStats({ 
              members: 0, 
              membersBreakdown: [],
              activeCells: 0, 
              assigned: 0, 
              totalUnits: 0, 
              unitBreakdown: [],
              attendanceRate: 0,
              attendanceTrend: 0,
              firstTimers: 0
            })
            setLoading(false)
            return
        }

        const unitIdsArray = managedUnits === 'ALL' ? null : Array.from(managedUnits)

        const allPeople = await fetchPeople()
        let activeCount = 0;
        let inactiveCount = 0;
        let pendingCount = 0;
        
        let memZone = 0;
        let memMC = 0;
        let memBusc = 0;
        let memCell = 0;
        
        const processPerson = (p) => {
            if (p.status === 'Active') activeCount++;
            else if (p.status === 'Inactive') inactiveCount++;
            else if (p.status === 'Pending') pendingCount++;
            
            if (p.unit_type === 'ZONAL') memZone++;
            else if (p.unit_type === 'MC') memMC++;
            else if (p.unit_type === 'BUSCENTA') memBusc++;
            else if (p.unit_type === 'CELL') memCell++;
        };
        
        if (unitIdsArray) {
            const unitIdsSet = new Set(unitIdsArray);
            allPeople.forEach(p => {
                if(unitIdsSet.has(p.unit_id)) processPerson(p);
            });
        } else {
            allPeople.forEach(processPerson);
        }
        const memberCount = activeCount + inactiveCount + pendingCount;
        const membersBreakdown = [
            { label: 'Active', value: activeCount, colorClass: 'text-emerald-400' },
            { label: 'Pending', value: pendingCount, colorClass: 'text-amber-400' },
            { label: 'Inactive', value: inactiveCount, colorClass: 'text-slate-400' }
        ];

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
        
        const unitBreakdown = [
            { label: 'Zones', value: zonesCount, colorClass: 'text-church-purple-400' },
            { label: 'MCs', value: mcsCount, colorClass: 'text-church-blue-400' },
            { label: 'Buscentas', value: buscentasCount, colorClass: 'text-church-magenta-400' },
            { label: 'Cells', value: cellsCount, colorClass: 'text-church-coral-400' }
        ];

        const assignedUnitIds = new Set(assignments?.map(a => a.unit_id) || [])
        const cellsWithLeaders = cells.filter(c => assignedUnitIds.has(c.id)).length
        const uniquePersonIds = new Set(assignments?.map(a => a.person_id) || [])
        const uniqueAssigned = uniquePersonIds.size

        let attendanceQuery = supabase.from('attendance_analytics_view').select('session_date, total_present, total_marked, first_timers_count')
        if (unitIdsArray) attendanceQuery = attendanceQuery.in('unit_id', unitIdsArray)
        const { data: attendanceData } = await attendanceQuery

        let attendanceRate = 0;
        let attendanceTrend = 0;
        let firstTimers = 0;

        if (attendanceData && attendanceData.length > 0) {
            const dateMap = {};
            attendanceData.forEach(row => {
                if (!dateMap[row.session_date]) {
                    dateMap[row.session_date] = { date: row.session_date, present: 0, marked: 0, firstTimers: 0 };
                }
                dateMap[row.session_date].present += row.total_present || 0;
                dateMap[row.session_date].marked += row.total_marked || 0;
                dateMap[row.session_date].firstTimers += row.first_timers_count || 0;
            });
            const sortedDates = Object.values(dateMap).sort((a, b) => new Date(b.date) - new Date(a.date));
            
            if (sortedDates.length > 0) {
                const latest = sortedDates[0];
                attendanceRate = latest.marked > 0 ? Math.round((latest.present / latest.marked) * 100) : 0;
                firstTimers = latest.firstTimers;

                if (sortedDates.length > 1) {
                    const prev = sortedDates[1];
                    const prevRate = prev.marked > 0 ? Math.round((prev.present / prev.marked) * 100) : 0;
                    attendanceTrend = attendanceRate - prevRate;
                }
            }
        }

        setStats({ 
          members: memberCount || 0, 
          membersBreakdown,
          activeCells: cellsWithLeaders,
          assigned: uniqueAssigned,
          totalUnits,
          unitBreakdown,
          attendanceRate,
          attendanceTrend,
          firstTimers
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
    // <IonPage>
    //   <IonContent className="ion-padding-bottom">
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
        className="grid grid-cols-2 gap-3 md:gap-4"
      >
        <motion.div variants={fadeUp}>
          <StatCard 
            label="Total Members" 
            value={stats.members} 
            icon={<Users size={18} />} 
            color="blue" 
            details={stats.membersBreakdown}
            onClick={handleFocusMembers}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard 
            label="Total Units" 
            value={stats.totalUnits} 
            icon={<CalendarCheck size={18} />} 
            color="amber" 
            details={stats.unitBreakdown}
            onClick={() => navigate('/mindmap')}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard 
            label="Attendance Rate" 
            value={stats.attendanceRate} 
            icon={<Clock size={18} />} 
            color="emerald" 
            subText="Current marked sessions"
            trend={stats.attendanceTrend}
            onClick={() => navigate('/attendance?tab=analytics')}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard 
            label="First Timers" 
            value={stats.firstTimers} 
            icon={<Zap size={18} />} 
            color="violet" 
            subText="From most recent session"
            onClick={() => navigate('/attendance?focus=first_timers')}
          />
        </motion.div>
      </motion.div>

      {/* ── Hierarchy Tree Card ── */}
      <motion.div 
        ref={treeContainerRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`bg-slate-900/50 border rounded-2xl p-4 md:p-6 shadow-xl overflow-hidden transition-colors duration-1000 ${highlightTree ? 'border-church-blue-500/50 bg-church-blue-500/10 ring-2 ring-church-blue-500/50' : 'border-slate-700/50'}`}
      >
        <HierarchyTree focusTrigger={focusMembersTrigger} />
      </motion.div>
        </div>
      // </IonContent>
    // </IonPage>
  )
}

function StatCard({ label, value, icon, color, subText, details, onClick, trend }) {
  const animatedValue = useAnimatedCounter(value)

  const iconBg = {
    blue: 'bg-church-blue-500/10 text-church-blue-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    red: 'bg-red-500/10 text-red-400',
    violet: 'bg-church-purple-500/10 text-church-purple-400',
  }

  return (
    <div 
      onClick={onClick}
      className={`p-3 md:p-4 rounded-xl bg-slate-800/50 flex flex-col gap-2 md:gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/20 group h-full ${onClick ? 'cursor-pointer hover:bg-slate-800/70' : 'cursor-default'}`}
    >
      <div className="flex items-start justify-between">
        <div className={`p-1.5 md:p-2 rounded-lg ${iconBg[color]} transition-transform duration-300 group-hover:scale-110 shrink-0`}>
           {icon}
        </div>
        <div className="flex flex-col items-end">
            <span className="text-xl md:text-2xl font-black text-white tabular-nums leading-none">
                {animatedValue}{trend !== undefined ? '%' : ''}
            </span>
            {trend !== undefined && (
                <span className={`text-[10px] md:text-xs font-bold mt-1 ${trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                    {trend > 0 ? '+' : ''}{trend}%
                </span>
            )}
        </div>
      </div>
      
      <div className="mt-auto pt-2">
        <p className="text-[11px] md:text-xs font-semibold text-slate-300 truncate">{label}</p>
        
        {subText && (
            <p className="text-[9px] md:text-[10px] text-slate-500 mt-0.5 leading-tight">{subText}</p>
        )}
        
        {details && details.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-1.5 mt-2 text-[11px] md:text-[12px] text-slate-500">
                {details.map((d, i) => (
                    <span key={i} className="flex items-center">
                        <span className="tabular-nums">{d.value}</span>&nbsp;<span>{d.label}</span>
                        {i < details.length - 1 && <span className="mx-1.5 text-slate-600">·</span>}
                    </span>
                ))}
            </div>
        )}
      </div>
    </div>
  )
}
