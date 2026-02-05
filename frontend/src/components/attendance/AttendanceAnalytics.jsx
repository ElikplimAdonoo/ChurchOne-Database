import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, TrendingUp, Users, Calendar } from 'lucide-react';

export default function AttendanceAnalytics({ currentRole }) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    async function fetchAnalytics() {
      if (!currentRole.unitName) return;
      setLoading(true);

      try {
        // 1. Get Unit ID
        const { data: unitData } = await supabase
          .from('organizational_units')
          .select('id')
          .eq('name', currentRole.unitName)
          .single();

        if (!unitData) throw new Error("Unit not found");

        // 2. Determine Query Scope based on Role Type
        // If Zonal Head -> Get stats for all MCs under Zone
        // If MC Head -> Get stats for all Buscentas under MC
        // If Buscenta Head -> Get stats for all Cells under Buscenta
        // If Cell Shepherd -> Get stats for this Cell only
        
        let subUnitsQuery = supabase.from('organizational_units').select('id, name');
        
        if (currentRole.unitType === 'CELL') {
             // For cell, we just want history of this cell
             // Logic handled below
        } else {
             subUnitsQuery = subUnitsQuery.eq('parent_id', unitData.id);
        }

        const { data: subUnits } = await subUnitsQuery;
        
        // 3. Fetch Attendance Data (Simplified for Demo)
        // In a real app we would use the 'attendance_analytics_view' and aggregate
        // For now, let's fetch sessions for the relevant units
        
        const unitIds = currentRole.unitType === 'CELL' 
            ? [unitData.id] 
            : subUnits?.map(u => u.id) || [];

        const { data: sessionData } = await supabase
            .from('attendance_analytics_view')
            .select('*')
            .in('unit_id', unitIds)
            .order('session_date', { ascending: true });

        // Process Data for Charts
        if (sessionData) {
            // Aggregate totals
            const totalScheduled = sessionData.reduce((acc, curr) => acc + (curr.total_marked || 0), 0);
            const totalPresent = sessionData.reduce((acc, curr) => acc + (curr.total_present || 0), 0);
            const rate = totalScheduled ? Math.round((totalPresent / totalScheduled) * 100) : 0;

            setStats({
                rate,
                total: totalScheduled,
                present: totalPresent,
                absent: totalScheduled - totalPresent
            });

            // Prepare History Chart Data (Group by Month or Date)
            // Simple mapping for now
            const historyMap = {};
            sessionData.forEach(s => {
                const date = s.session_date;
                if (!historyMap[date]) {
                    historyMap[date] = { date, present: 0, absent: 0, total: 0 };
                }
                historyMap[date].present += s.total_present || 0;
                historyMap[date].absent += s.total_absent || 0;
                historyMap[date].total += s.total_marked || 0;
            });

            setHistory(Object.values(historyMap).sort((a,b) => new Date(a.date) - new Date(b.date)));
        }

      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [currentRole.unitName, currentRole.unitType]);

  const COLORS = ['#0066FF', '#10B981']; // Church Blue, Emerald

  if (loading) {
     return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-church-blue-500" size={40} />
        </div>
     );
  }

  if (!stats || stats.total === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-600">
            <TrendingUp size={56} className="mb-4 opacity-50 text-church-blue-400" />
            <p className="text-lg font-bold">No attendance data available yet.</p>
            <p className="text-sm">Mark some attendance to see analytics here.</p>
        </div>
      );
  }

  return (
    <div className="space-y-6">
       {/* KPI Cards */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 px-6 rounded-2xl border-2 border-church-blue-500/40 text-church-blue-400 bg-church-blue-500/5 shadow-xl backdrop-blur-md flex flex-col gap-3 transition-all hover:scale-[1.02]">
                <div className="flex items-center gap-2.5">
                    <TrendingUp size={20} className="shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] opacity-80">Attendance Rate</span>
                </div>
                <div className="text-3xl font-black text-white tracking-tight flex items-baseline gap-2">
                    {stats.rate}%
                    <span className="text-xs font-bold text-church-blue-400 opacity-60">Average</span>
                </div>
            </div>

            <div className="p-5 px-6 rounded-2xl border-2 border-emerald-500/40 text-emerald-400 bg-emerald-500/5 shadow-xl backdrop-blur-md flex flex-col gap-3 transition-all hover:scale-[1.02]">
                <div className="flex items-center gap-2.5">
                    <Users size={20} className="shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] opacity-80">Total Present</span>
                </div>
                <div className="text-3xl font-black text-white tracking-tight flex items-baseline gap-2">
                    {stats.present}
                    <span className="text-xs font-bold text-emerald-400 opacity-60">/ {stats.total} total</span>
                </div>
            </div>

            <div className="p-5 px-6 rounded-2xl border-2 border-yellow-500/40 text-yellow-400 bg-yellow-500/5 shadow-xl backdrop-blur-md flex flex-col gap-3 transition-all hover:scale-[1.02]">
                <div className="flex items-center gap-2.5">
                    <Calendar size={20} className="shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] opacity-80">Sessions</span>
                </div>
                <div className="text-3xl font-black text-white tracking-tight flex items-baseline gap-2">
                    {history.length}
                    <span className="text-xs font-bold text-yellow-400 opacity-60">Recorded</span>
                </div>
            </div>
       </div>

       {/* Charts Info */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Trend Chart */}
            <div className="bg-white p-6 rounded-2xl border-4 border-church-blue-500 shadow-lg">
                <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                    <BarChart size={24} className="text-church-blue-500" />
                    Attendance Trend
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickFormatter={(val) => val.substring(5)} />
                            <YAxis stroke="#94a3b8" fontSize={12} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                itemStyle={{ color: '#f8fafc' }}
                            />
                            <Bar dataKey="present" name="Present" fill="#0066FF" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="absent" name="Absent" fill="#FF6B5A" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Distribution Chart */}
            <div className="bg-slate-900/80 p-6 rounded-2xl border-2 border-church-blue-500/50 shadow-lg backdrop-blur-sm">
                <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                    <Users size={24} className="text-church-blue-400" />
                    Overall Distribution
                </h3>
                <div className="h-64 flex justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={[
                                    { name: 'Present', value: stats.present },
                                    { name: 'Absent', value: stats.absent }
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {[{ name: 'Present', value: stats.present }, { name: 'Absent', value: stats.absent }].map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-church-blue-500"></div>
                        <span className="text-sm text-gray-700 font-semibold">Present</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-church-coral-500"></div>
                        <span className="text-sm text-gray-700 font-semibold">Absent</span>
                    </div>
                </div>
            </div>

       </div>
    </div>
  );
}
