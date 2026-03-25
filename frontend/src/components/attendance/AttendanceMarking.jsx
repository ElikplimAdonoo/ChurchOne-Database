import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Save, UserCheck, UserX, Loader2, CheckCircle, UserPlus, Sparkles } from 'lucide-react';
import ImageModal from '../common/ImageModal';

export default function AttendanceMarking({ currentRole, overrideUnitId = null, overrideUnitType = null }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attendance, setAttendance] = useState({});
  const [firstTimers, setFirstTimers] = useState(0);
  const [soulsWon, setSoulsWon] = useState(0);
  const [activeUnitName, setActiveUnitName] = useState(currentRole.unitName);
  const [successMsg, setSuccessMsg] = useState('');
  const [imageModalConfig, setImageModalConfig] = useState({ isOpen: false, src: '', title: '' });

  // Use overrideUnitId (when a higher-level leader picks a cell), else fall back to own unit
  const effectiveUnitId = overrideUnitId || currentRole.unitId;
  const effectiveUnitType = overrideUnitType || currentRole.unitType;

  // Fetch members for the selected unit
  useEffect(() => {
    async function fetchMembers() {
      if (!effectiveUnitId) return;
      
      setLoading(true);
      try {
        // If an override is active, first fetch that unit's actual name
        if (overrideUnitId) {
            const { data: uData } = await supabase
                .from('organizational_units')
                .select('name')
                .eq('id', overrideUnitId)
                .single();
            if (uData) setActiveUnitName(uData.name);
        } else {
            setActiveUnitName(currentRole.unitName);
        }

        // Use unitId directly — no name-based lookup needed (fixes fragile query)
        const { data: memberData, error: memberError } = await supabase
          .from('position_assignments')
          .select(`
            person_id,
            people ( id, full_name, photo_url, is_active )
          `)
          .eq('unit_id', effectiveUnitId)
          .eq('is_active', true);

        if (memberError) throw memberError;

        const formattedMembers = memberData
          .map(m => m.people)
          .filter(p => p && p.is_active)
          .sort((a, b) => a.full_name.localeCompare(b.full_name));

        setMembers(formattedMembers);
        
        // Initialize all as PRESENT by default
        const initialStatus = {};
        formattedMembers.forEach(m => {
          initialStatus[m.id] = 'PRESENT';
        });
        setAttendance(initialStatus);

      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMembers();
  }, [effectiveUnitId]);

  // When date changes, load existing session growth counts (if session exists)
  useEffect(() => {
    if (!effectiveUnitId || !date) return;
    async function loadSessionCounts() {
      const { data } = await supabase
        .from('attendance_sessions')
        .select('first_timers_count, souls_won_count')
        .eq('unit_id', effectiveUnitId)
        .eq('session_date', date)
        .maybeSingle();
      if (data) {
        setFirstTimers(data.first_timers_count ?? 0);
        setSoulsWon(data.souls_won_count ?? 0);
      } else {
        setFirstTimers(0);
        setSoulsWon(0);
      }
    }
    loadSessionCounts();
  }, [effectiveUnitId, date]);

  const toggleStatus = (personId) => {
    setAttendance(prev => ({
      ...prev,
      [personId]: prev[personId] === 'PRESENT' ? 'ABSENT' : 'PRESENT'
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccessMsg('');
    
    try {
        if (!effectiveUnitId) throw new Error("No unit selected");

        // Get current auth user for audit trail (fixes OI-2)
        const { data: { user } } = await supabase.auth.getUser();

        // Create/Get Session — upsert handles re-submission for same day
        const { data: sessionData, error: sessionError } = await supabase
            .from('attendance_sessions')
            .upsert({
                unit_id: effectiveUnitId,
                session_date: date,
                created_by: user?.id || null,
                first_timers_count: firstTimers,
                souls_won_count: soulsWon,
            }, { onConflict: 'unit_id,session_date' })
            .select()
            .single();

        if (sessionError) throw sessionError;

        // Create Records
        const records = members.map(m => ({
            session_id: sessionData.id,
            person_id: m.id,
            status: attendance[m.id] || 'ABSENT'
        }));

        const { error: recordsError } = await supabase
            .from('attendance_records')
            .upsert(records, { onConflict: 'session_id,person_id' });

        if (recordsError) throw recordsError;

        setSuccessMsg('Attendance marked successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);

    } catch (error) {
        console.error("Error submitting attendance:", error);
        alert("Failed to submit attendance. See console.");
    } finally {
        setSubmitting(false);
    }
  };

  // No longer hard-block non-CELL roles — higher roles can pass overrideUnitId
  // However, we MUST enforce that the selected unit IS a cell before allowing marking.
  if (!effectiveUnitId || effectiveUnitType !== 'CELL') {
    return (
        <div className="flex flex-col items-center justify-center h-64 bg-slate-900/40 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-sm">
            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-white/5 shadow-2xl mb-6">
                 <UserX size={32} className="text-church-blue-500/50" />
            </div>
            <p className="text-xl font-black text-slate-100">No Cell Selected</p>
            <p className="text-sm text-slate-500 mt-2">Please drill down to a specific Cell above to mark attendance.</p>
        </div>
    );
  }


  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-2xl border-2 border-church-blue-500/30 backdrop-blur-sm">
        <div className="flex flex-wrap items-end gap-4 w-full md:w-auto">
            <div className="flex flex-col">
                <label className="text-xs text-church-blue-400 uppercase font-black tracking-wider mb-1">Session Date</label>
                <div className="relative">
                    <input 
                        type="date" 
                        value={date}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-black/50 border-2 border-slate-700 text-white rounded-lg px-3 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-church-blue-500/50 focus:border-church-blue-500 font-semibold"
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-church-blue-500" size={16} />
                </div>
            </div>
            <div className="flex flex-col">
                <label className="text-xs text-church-blue-400 uppercase font-black tracking-wider mb-1">Unit</label>
                <span className="text-white font-bold px-3 py-2 bg-black/50 rounded-lg border-2 border-slate-700 block shadow-inner">
                    {activeUnitName}
                </span>
            </div>

            {/* Growth Counters */}
            <div className="flex flex-col">
                <label className="text-xs text-emerald-400 uppercase font-black tracking-wider mb-1 flex items-center gap-1">
                    <UserPlus size={12} /> First Timers
                </label>
                <input
                    type="number"
                    min={0}
                    value={firstTimers}
                    onChange={(e) => setFirstTimers(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24 bg-black/50 border-2 border-emerald-500/40 text-white rounded-lg px-3 py-2 text-center font-black text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
            </div>
            <div className="flex flex-col">
                <label className="text-xs text-church-yellow-400 uppercase font-black tracking-wider mb-1 flex items-center gap-1">
                    <Sparkles size={12} /> Souls Won
                </label>
                <input
                    type="number"
                    min={0}
                    value={soulsWon}
                    onChange={(e) => setSoulsWon(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24 bg-black/50 border-2 border-church-yellow-500/40 text-white rounded-lg px-3 py-2 text-center font-black text-lg focus:outline-none focus:ring-2 focus:ring-church-yellow-500/50 focus:border-church-yellow-500"
                />
            </div>
        </div>

        <button 
            onClick={handleSubmit}
            disabled={submitting || loading}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-gradient-church hover:opacity-90 text-white px-6 py-2.5 rounded-xl font-black transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed border-2 border-church-blue-600"
        >
            {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            <span>{submitting ? 'Saving...' : 'Submit'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="bg-church-blue-900/30 border-2 border-church-blue-500 text-church-blue-300 p-4 rounded-xl flex items-center gap-3 font-bold backdrop-blur-sm">
            <CheckCircle size={24} />
            {successMsg}
        </div>
      )}

      {/* Member List */}
      <div className="bg-slate-900/60 rounded-2xl border-2 border-church-blue-500/30 overflow-hidden shadow-lg backdrop-blur-sm">
        {loading ? (
            <div className="p-12 flex justify-center">
                <Loader2 className="animate-spin text-church-blue-500" size={40} />
            </div>
        ) : members.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-semibold">
                No members found in this cell.
            </div>
        ) : (
            <div className="divide-y divide-slate-700/50">
                <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-slate-800/80 text-xs font-black text-church-blue-400 uppercase tracking-wider">
                    <div className="col-span-8">Member Name</div>
                    <div className="col-span-4 text-center">Status</div>
                </div>
                {members.map(member => (
                    <div key={member.id} className="flex flex-col md:grid md:grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors border-b border-white/5 md:border-none">
                        <div className="w-full md:col-span-8 flex items-center gap-4">
                            <div 
                                onClick={() => member.photo_url && setImageModalConfig({ isOpen: true, src: member.photo_url, title: member.full_name })}
                                className={`w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-white/5 shadow-sm transition-transform hover:scale-105 ${member.photo_url ? 'cursor-pointer' : ''}`}
                            >
                                {member.photo_url ? (
                                    <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" />
                                ) : (
                                    <UserCheck size={20} className="text-slate-500" />
                                )}
                            </div>
                            <span className="font-bold text-slate-200 text-lg md:text-base">{member.full_name}</span>
                        </div>
                        <div className="w-full md:col-span-4 flex items-center justify-between md:justify-end gap-3 mt-2 md:mt-0 bg-black/20 md:bg-transparent p-2 md:p-0 rounded-xl">
                            <span className="md:hidden text-xs font-black text-slate-500 uppercase tracking-wider pl-2">Status:</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setAttendance(prev => ({ ...prev, [member.id]: 'PRESENT' }))}
                                    className={`px-4 py-2 rounded-xl transition-all font-bold text-sm flex items-center gap-2 ${
                                        attendance[member.id] === 'PRESENT'
                                            ? 'bg-church-blue-500 text-white shadow-lg shadow-church-blue-500/20'
                                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-white/5'
                                    }`}
                                >
                                    <UserCheck size={16} /> Present
                                </button>
                                <button
                                    onClick={() => setAttendance(prev => ({ ...prev, [member.id]: 'ABSENT' }))}
                                    className={`px-4 py-2 rounded-xl transition-all font-bold text-sm flex items-center gap-2 ${
                                        attendance[member.id] === 'ABSENT'
                                            ? 'bg-church-coral-500 text-white shadow-lg shadow-church-coral-500/20'
                                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-white/5'
                                    }`}
                                >
                                    <UserX size={16} /> Absent
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      <ImageModal 
                isOpen={imageModalConfig.isOpen}
                onClose={() => setImageModalConfig(prev => ({ ...prev, isOpen: false }))}
                imageSrc={imageModalConfig.src}
                title={imageModalConfig.title}
            />
    </div>
  );
}
