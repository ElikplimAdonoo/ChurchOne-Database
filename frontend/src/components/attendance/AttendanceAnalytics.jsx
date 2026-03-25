import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Loader2, TrendingUp, Users, Calendar, UserX, Activity, UserPlus, Sparkles } from 'lucide-react';

// ─── Custom Tooltip ─────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs text-slate-400 mb-2 font-semibold">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-sm font-bold" style={{ color: p.color }}>
          {p.name}: <span className="text-white">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, borderColor, iconColor, bgColor }) {
  return (
    <div
      className={`p-5 px-6 rounded-2xl border-2 shadow-xl backdrop-blur-md flex flex-col gap-3 transition-all hover:scale-[1.02] ${borderColor} ${bgColor}`}
    >
      <div className={`flex items-center gap-2.5 ${iconColor}`}>
        <Icon size={18} className="shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-[0.15em] opacity-80">{label}</span>
      </div>
      <div className="text-3xl font-black text-white tracking-tight flex items-baseline gap-2">
        {value}
        {sub && <span className={`text-xs font-bold opacity-60 ${iconColor}`}>{sub}</span>}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AttendanceAnalytics({ currentRole, overrideUnitId = null, overrideUnitType = null }) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);

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

          setStats({ rate, total: totalScheduled, present: totalPresent, absent: totalScheduled - totalPresent, firstTimers: totalFirstTimers, soulsWon: totalSoulsWon });

          const historyMap = {};
          sessionData.forEach((s) => {
            const date = s.session_date;
            if (!historyMap[date]) historyMap[date] = { date, present: 0, absent: 0, total: 0 };
            historyMap[date].present += s.total_present || 0;
            historyMap[date].absent += s.total_absent || 0;
            historyMap[date].total += s.total_marked || 0;
          });

          setHistory(Object.values(historyMap).sort((a, b) => new Date(a.date) - new Date(b.date)));
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [currentRole.unitId, currentRole.unitType, overrideUnitId, overrideUnitType]);

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
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <TrendingUp size={56} className="mb-4 opacity-40 text-church-blue-400" />
        <p className="text-lg font-bold text-slate-200">No attendance data yet.</p>
        <p className="text-sm mt-1">Mark some attendance to see analytics here.</p>
      </div>
    );
  }

  // ── Main View ──
  return (
    <div className="space-y-6">

      {/* ── KPI Cards Row 1: Attendance stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={TrendingUp}
          label="Attendance Rate"
          value={`${stats.rate}%`}
          sub="Average"
          borderColor="border-church-blue-500/40"
          iconColor="text-church-blue-400"
          bgColor="bg-church-blue-500/5"
        />
        <KpiCard
          icon={Users}
          label="Total Present"
          value={stats.present}
          sub={`/ ${stats.total} total`}
          borderColor="border-emerald-500/40"
          iconColor="text-emerald-400"
          bgColor="bg-emerald-500/5"
        />
        <KpiCard
          icon={UserX}
          label="Total Absent"
          value={stats.absent}
          sub={`/ ${stats.total} total`}
          borderColor="border-church-coral-500/40"
          iconColor="text-church-coral-400"
          bgColor="bg-church-coral-500/5"
        />
        <KpiCard
          icon={Calendar}
          label="Sessions"
          value={history.length}
          sub="Recorded"
          borderColor="border-yellow-500/40"
          iconColor="text-yellow-400"
          bgColor="bg-yellow-500/5"
        />
      </div>

      {/* ── KPI Cards Row 2: Growth metrics ── */}
      <div className="grid grid-cols-2 gap-4">
        <KpiCard
          icon={UserPlus}
          label="First Timers"
          value={stats.firstTimers ?? 0}
          sub="This period"
          borderColor="border-emerald-500/40"
          iconColor="text-emerald-400"
          bgColor="bg-emerald-500/5"
        />
        <KpiCard
          icon={Sparkles}
          label="Souls Won"
          value={stats.soulsWon ?? 0}
          sub="This period"
          borderColor="border-church-yellow-500/40"
          iconColor="text-church-yellow-400"
          bgColor="bg-church-yellow-500/5"
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Trend Area Chart */}
        <div className="bg-slate-900/80 p-6 rounded-2xl border-2 border-church-blue-500/30 shadow-lg backdrop-blur-sm">
          <h3 className="text-base font-black text-white mb-5 flex items-center gap-2">
            <Activity size={20} className="text-church-blue-400" />
            Attendance Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0066FF" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0066FF" stopOpacity={0} />
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
                  stroke="#0066FF"
                  strokeWidth={2.5}
                  fill="url(#gradPresent)"
                  dot={{ r: 3, fill: '#0066FF', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#0066FF' }}
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

        {/* Distribution Donut Chart */}
        <div className="bg-slate-900/80 p-6 rounded-2xl border-2 border-church-blue-500/30 shadow-lg backdrop-blur-sm">
          <h3 className="text-base font-black text-white mb-5 flex items-center gap-2">
            <Users size={20} className="text-church-blue-400" />
            Overall Distribution
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
          {/* Center label overlay */}
          <div className="flex justify-center gap-6 -mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#0066FF' }} />
              <span className="text-xs text-slate-300 font-semibold">Present ({stats.present})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF6B5A' }} />
              <span className="text-xs text-slate-300 font-semibold">Absent ({stats.absent})</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

