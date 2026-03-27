import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Loader2, TrendingUp, Users, Calendar, UserX, Activity, UserPlus, Flame, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAnimatedCounter } from '../../hooks/useAnimatedCounter';

// ─── Stagger Animations ─────────────────────────────────────────────────────
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } }
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } }
};

// ─── Enhanced Tooltip ────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const present = payload.find(p => p.name === 'Present')?.value || 0;
  const absent = payload.find(p => p.name === 'Absent')?.value || 0;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs text-slate-400 mb-2 font-semibold">{label}</p>
      <p className="text-sm font-bold text-emerald-400">
        Present: <span className="text-white">{present}</span>
      </p>
      <p className="text-sm font-bold text-red-400">
        Absent: <span className="text-white">{absent}</span>
      </p>
      <p className="text-[10px] text-slate-500 mt-1.5 border-t border-slate-700 pt-1.5">
        {present + absent} total · {present + absent > 0 ? Math.round((present / (present + absent)) * 100) : 0}% rate
      </p>
    </div>
  );
}

// ─── Hero KPI Card (Attendance Rate) ─────────────────────────────────────────
function HeroKpiCard({ rate, trend, trendValue }) {
  const animatedRate = useAnimatedCounter(rate, 1400, true);
  
  // Conditional color tinting based on rate
  const tint = rate >= 80 
    ? 'bg-emerald-500/5 border-emerald-500/20' 
    : rate >= 70 
      ? 'bg-amber-500/5 border-amber-500/20' 
      : 'bg-red-500/5 border-red-500/20';
  
  const rateColor = rate >= 80 
    ? 'text-emerald-400' 
    : rate >= 70 
      ? 'text-amber-400' 
      : 'text-red-400';

  const trendColor = trend === 'up' ? 'text-emerald-400' : 'text-red-400';
  const TrendIcon = trend === 'up' ? ArrowUpRight : ArrowDownRight;

  return (
    <motion.div
      variants={fadeUp}
      className={`col-span-2 p-6 rounded-2xl shadow-xl backdrop-blur-md border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/20 ${tint}`}
    >
      <div className="flex items-center gap-2.5 text-slate-400 mb-3">
        <TrendingUp size={16} className="shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-[0.15em]">Attendance Rate</span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className={`text-5xl md:text-6xl font-black tabular-nums tracking-tight ${rateColor}`}>
          {animatedRate}
        </span>
        {trendValue != null && (
          <div className={`flex items-center gap-0.5 text-xs font-bold ${trendColor}`}>
            <TrendIcon size={14} />
            <span>{trend === 'up' ? '+' : ''}{trendValue}%</span>
            <span className="text-slate-500 ml-1">vs last</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Standard KPI Card ───────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, iconColor, bgColor, isSpecial }) {
  const animatedValue = useAnimatedCounter(typeof value === 'number' ? value : 0);
  const displayValue = typeof value === 'number' ? animatedValue : value;

  return (
    <motion.div
      variants={fadeUp}
      className={`p-5 px-6 rounded-2xl shadow-xl backdrop-blur-md flex flex-col gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/20 ${bgColor} ${isSpecial ? 'relative overflow-hidden' : ''}`}
    >
      {/* Subtle glow for Souls Won */}
      {isSpecial && value > 0 && (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent pointer-events-none" />
      )}
      <div className={`flex items-center gap-2.5 ${iconColor} relative z-10`}>
        <Icon size={18} className={`shrink-0 ${isSpecial && value > 0 ? 'animate-pulse' : ''}`} />
        <span className="text-[10px] font-black uppercase tracking-[0.15em] opacity-80">{label}</span>
      </div>
      <div className="text-3xl font-black text-white tracking-tight flex items-baseline gap-2 relative z-10 tabular-nums">
        {displayValue}
        {sub && <span className={`text-xs font-bold opacity-60 ${iconColor}`}>{sub}</span>}
      </div>
    </motion.div>
  );
}

// ─── Time Filter Pills ───────────────────────────────────────────────────────
function TimeFilterPills({ active, onChange }) {
  const filters = [
    { key: '7', label: 'Last 7 Days' },
    { key: '30', label: 'Last 30 Days' },
    { key: 'all', label: 'All Time' },
  ];
  return (
    <div className="flex gap-1.5">
      {filters.map(f => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 active:scale-95 ${
            active === f.key
              ? 'bg-church-blue-500/20 text-church-blue-400 border border-church-blue-500/30'
              : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-slate-700'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AttendanceAnalytics({ currentRole, overrideUnitId = null, overrideUnitType = null }) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [timeFilter, setTimeFilter] = useState('all');

  useEffect(() => {
    async function fetchAnalytics() {
      const effectiveUnitId = overrideUnitId || currentRole.unitId;
      const effectiveUnitType = overrideUnitType || currentRole.unitType;

      if (!effectiveUnitId) return;
      setLoading(true);

      try {
        let unitIds = [effectiveUnitId];

        if (effectiveUnitType !== 'CELL') {
          const { data: managedData, error: managedError } = await supabase
            .rpc('get_managed_units', { root_parent_id: effectiveUnitId });

          if (!managedError && managedData) {
            unitIds = managedData.map((row) =>
              typeof row === 'object' ? (row.id || row.get_managed_units || Object.values(row)[0]) : row
            );
          } else {
            console.error('Failed to fetch managed units for analytics:', managedError);
            unitIds = [];
          }
        }

        if (unitIds.length === 0) {
          setLoading(false);
          setStats({ total: 0 });
          return;
        }

        const { data: sessionData } = await supabase
          .from('attendance_analytics_view')
          .select('*')
          .in('unit_id', unitIds)
          .order('session_date', { ascending: true });

        if (sessionData) {
          const totalScheduled = sessionData.reduce((acc, curr) => acc + (curr.total_marked || 0), 0);
          const totalPresent = sessionData.reduce((acc, curr) => acc + (curr.total_present || 0), 0);
          const rate = totalScheduled ? Math.round((totalPresent / totalScheduled) * 100) : 0;

          const totalFirstTimers = sessionData.reduce((acc, curr) => acc + (curr.first_timers_count || 0), 0);
          const totalSoulsWon = sessionData.reduce((acc, curr) => acc + (curr.souls_won_count || 0), 0);

          // Build per-date history
          const historyMap = {};
          sessionData.forEach((s) => {
            const date = s.session_date;
            if (!historyMap[date]) historyMap[date] = { date, present: 0, absent: 0, total: 0 };
            historyMap[date].present += s.total_present || 0;
            historyMap[date].absent += s.total_absent || 0;
            historyMap[date].total += s.total_marked || 0;
          });

          const sortedHistory = Object.values(historyMap).sort((a, b) => new Date(a.date) - new Date(b.date));

          // Compute trend (compare last 2 session dates)
          let trend = null;
          let trendValue = null;
          if (sortedHistory.length >= 2) {
            const last = sortedHistory[sortedHistory.length - 1];
            const prev = sortedHistory[sortedHistory.length - 2];
            const lastRate = last.total > 0 ? Math.round((last.present / last.total) * 100) : 0;
            const prevRate = prev.total > 0 ? Math.round((prev.present / prev.total) * 100) : 0;
            const diff = lastRate - prevRate;
            trend = diff >= 0 ? 'up' : 'down';
            trendValue = diff;
          }

          setStats({ rate, total: totalScheduled, present: totalPresent, absent: totalScheduled - totalPresent, firstTimers: totalFirstTimers, soulsWon: totalSoulsWon, trend, trendValue });
          setHistory(sortedHistory);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [currentRole.unitId, currentRole.unitType, overrideUnitId, overrideUnitType]);

  // ── Filtered History ──
  const filteredHistory = useMemo(() => {
    if (timeFilter === 'all') return history;
    const days = parseInt(timeFilter);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return history.filter(h => new Date(h.date) >= cutoff);
  }, [history, timeFilter]);

  // ── Auto Insight ──
  const insight = useMemo(() => {
    if (filteredHistory.length < 2) return null;
    const recentHalf = filteredHistory.slice(Math.floor(filteredHistory.length / 2));
    const olderHalf = filteredHistory.slice(0, Math.floor(filteredHistory.length / 2));
    
    const recentAvg = recentHalf.reduce((a, h) => a + (h.total > 0 ? (h.present / h.total) * 100 : 0), 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((a, h) => a + (h.total > 0 ? (h.present / h.total) * 100 : 0), 0) / olderHalf.length;
    const diff = Math.round(recentAvg - olderAvg);
    
    if (Math.abs(diff) < 2) return { text: 'Attendance has been stable across this period.', type: 'neutral' };
    if (diff > 0) return { text: `Attendance improved by ~${diff}% in recent sessions.`, type: 'up' };
    return { text: `Attendance dropped by ~${Math.abs(diff)}% in recent sessions.`, type: 'down' };
  }, [filteredHistory]);

  const PIE_COLORS = ['#0066FF', '#FF6B5A'];

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-church-blue-500" size={40} />
      </div>
    );
  }

  // ── Empty State ──
  if (!stats || stats.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-72 text-slate-400">
        <div className="w-20 h-20 rounded-2xl bg-church-blue-500/10 flex items-center justify-center mb-5">
          <TrendingUp size={40} className="text-church-blue-400 opacity-60" />
        </div>
        <p className="text-lg font-bold text-slate-200">No attendance data yet</p>
        <p className="text-sm mt-1.5 text-slate-500 max-w-xs text-center">Start by marking attendance for your unit. Analytics will appear here automatically.</p>
      </div>
    );
  }

  // ── Main View ──
  return (
    <div className="space-y-8">

      {/* ── KPI Cards Row 1: Hero Attendance Rate + Secondary Stats ── */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <HeroKpiCard
          rate={stats.rate}
          trend={stats.trend}
          trendValue={stats.trendValue}
        />
        <KpiCard
          icon={Users}
          label="Total Present"
          value={stats.present}
          sub={`/ ${stats.total}`}
          iconColor="text-emerald-400"
          bgColor="bg-emerald-500/5"
        />
        <KpiCard
          icon={UserX}
          label="Total Absent"
          value={stats.absent}
          sub={`/ ${stats.total}`}
          iconColor="text-red-400"
          bgColor="bg-red-500/5"
        />
      </motion.div>

      {/* ── KPI Cards Row 2: Growth metrics (de-emphasized) ── */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-3 gap-4">
        <KpiCard
          icon={Calendar}
          label="Sessions"
          value={history.length}
          sub="Recorded"
          iconColor="text-slate-400"
          bgColor="bg-slate-800/40"
        />
        <KpiCard
          icon={UserPlus}
          label="First Timers"
          value={stats.firstTimers ?? 0}
          sub="Total"
          iconColor="text-emerald-400"
          bgColor="bg-slate-800/40"
        />
        <KpiCard
          icon={Flame}
          label="Souls Won"
          value={stats.soulsWon ?? 0}
          sub="Total"
          iconColor="text-amber-400"
          bgColor="bg-amber-500/5"
          isSpecial={true}
        />
      </motion.div>

      {/* ── Charts Row ── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.25 }}
        className="grid grid-cols-1 lg:grid-cols-5 gap-6"
      >

        {/* Trend Area Chart (wider) */}
        <div className="lg:col-span-3 bg-slate-900/80 p-6 rounded-2xl shadow-lg backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Activity size={20} className="text-church-blue-400" />
              Attendance Trend
            </h3>
            <TimeFilterPills active={timeFilter} onChange={setTimeFilter} />
          </div>

          {/* Auto Insight */}
          {insight && (
            <div className={`text-[11px] font-semibold px-3 py-2 rounded-lg mb-4 ${
              insight.type === 'up'   ? 'bg-emerald-500/10 text-emerald-400' :
              insight.type === 'down' ? 'bg-red-500/10 text-red-400' :
                                        'bg-slate-800 text-slate-400'
            }`}>
              {insight.type === 'up' && '📈 '}{insight.type === 'down' && '📉 '}{insight.text}
            </div>
          )}

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradAbsent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B5A" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#FF6B5A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="date"
                  stroke="#475569"
                  fontSize={11}
                  tickFormatter={(val) => val.substring(5)}
                  tick={{ fill: '#94a3b8' }}
                />
                <YAxis stroke="#475569" fontSize={11} tick={{ fill: '#94a3b8' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', color: '#94a3b8', paddingTop: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="present"
                  name="Present"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#gradPresent)"
                  dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#10b981' }}
                />
                <Area
                  type="monotone"
                  dataKey="absent"
                  name="Absent"
                  stroke="#FF6B5A"
                  strokeWidth={2.5}
                  fill="url(#gradAbsent)"
                  dot={{ r: 3, fill: '#FF6B5A', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#FF6B5A' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Donut Chart (narrower) */}
        <div className="lg:col-span-2 bg-slate-900/80 p-6 rounded-2xl shadow-lg backdrop-blur-sm">
          <h3 className="text-base font-black text-white mb-5 flex items-center gap-2">
            <Users size={20} className="text-church-blue-400" />
            Distribution
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Present', value: stats.present },
                    { name: 'Absent', value: stats.absent },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={86}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {PIE_COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    color: '#f8fafc',
                    borderRadius: '0.75rem',
                    fontSize: '13px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex justify-center gap-6 -mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-300 font-semibold">Present ({stats.present})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF6B5A' }} />
              <span className="text-xs text-slate-300 font-semibold">Absent ({stats.absent})</span>
            </div>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
