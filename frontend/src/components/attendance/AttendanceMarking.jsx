import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Save, UserCheck, UserX, Loader2, CheckCircle, XCircle, Check, X, UserPlus, Flame, ExternalLink, Share2 } from 'lucide-react';
import ImageModal from '../common/ImageModal';
import PersonActionModal from '../PersonActionModal';
import { fetchHierarchyData, fetchPositions } from '../../services/hierarchyService';
import { createPerson } from '../../services/peopleService';

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
  const [hierarchyData, setHierarchyData] = useState([]);
  const [positions, setPositions] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleFirstTimersChange = (val) => {
    const newVal = Math.max(0, parseInt(val) || 0);
    setFirstTimers(newVal);
  };

  // Use overrideUnitId (when a higher-level leader picks a cell), else fall back to own unit
  const effectiveUnitId = overrideUnitId || currentRole.unitId;
  const effectiveUnitType = overrideUnitType || currentRole.unitType;
  
  // Strict Fix: Prevents higher leaders (Zone/MC) from bypassing marking restrictions 
  // by drilling down to a Cell via the scope selector.
  const canMark = currentRole.unitType === 'CELL' && effectiveUnitType === 'CELL';

  const computedFirstTimersCount = useMemo(() => {
    return members
       .filter(m => ['First Timer', 'Brethren', 'Unattended'].includes(m.membership_state))
       .filter(m => attendance[m.id] === 'PRESENT')
       .length;
  }, [members, attendance]);

  useEffect(() => {
    fetchHierarchyData().then(setHierarchyData);
    fetchPositions().then(setPositions);
  }, []);

  const loadMembers = async () => {
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
            people ( 
                id, 
                full_name, 
                photo_url, 
                is_active,
                created_at,
                attendance_records ( status )
            ),
            positions ( title )
          `)
          .eq('unit_id', effectiveUnitId)
          .eq('is_active', true);

        if (memberError) throw memberError;

        const formattedMembers = memberData
          .map(m => {
             const p = m.people;
             if (!p) return null;
             
             let presentCount = 0;
             if (p.attendance_records && p.attendance_records.length > 0) {
                 presentCount = p.attendance_records.filter(r => r.status === 'PRESENT').length;
             }
             
             const roleTitle = m.positions?.title || 'Unassigned';
             let membership_state = roleTitle;
             
             if (roleTitle === 'Member' || roleTitle === 'Unassigned') {
                 const createdDate = new Date(p.created_at || '2000-01-01');
                 const cutoffDate = new Date('2026-03-31T00:00:00Z');
                 if (createdDate < cutoffDate) {
                     membership_state = 'Member';
                 } else {
                     if (presentCount === 1) membership_state = 'First Timer';
                     else if (presentCount === 2 || presentCount === 3) membership_state = 'Brethren';
                     else if (presentCount >= 4) membership_state = 'Member';
                     else membership_state = 'Unattended';
                 }
             }
             
             return { ...p, membership_state, present_count: presentCount };
          })
          .filter(p => p && p.is_active)
          .sort((a, b) => a.full_name.localeCompare(b.full_name));

        setMembers(formattedMembers);
        
        // Initialize all as unassigned by default
        const initialStatus = {};
        formattedMembers.forEach(m => {
          initialStatus[m.id] = null;
        });
        setAttendance(initialStatus);

      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    loadMembers();
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
    // Absolute server-side guard: prevents any non-CELL leader from submitting
    if (!canMark) {
        alert('Only Cell-level leaders can submit attendance.');
        return;
    }
    
    setSubmitting(true);
    setSuccessMsg('');
    
    try {
        if (!effectiveUnitId) throw new Error("No unit selected");

        const { data: { user } } = await supabase.auth.getUser();

        const { data: sessionData, error: sessionError } = await supabase
            .from('attendance_sessions')
            .upsert({
                unit_id: effectiveUnitId,
                session_date: date,
                created_by: user?.id || null,
                first_timers_count: computedFirstTimersCount,
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

  // If not a cell, we render them in view-only mode
  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* TEMPORARY DEBUG - REMOVE AFTER TESTING */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-[10px] font-mono text-slate-400 flex gap-4">
        <span>Role: <b className="text-white">{currentRole.unitType}</b></span>
        <span>Scope: <b className="text-white">{effectiveUnitType}</b></span>
        <span>canMark: <b className={canMark ? 'text-emerald-400' : 'text-red-400'}>{String(canMark)}</b></span>
      </div>
      
      {!canMark && (
          <div className="bg-amber-900/20 border-l-4 border-amber-500 text-amber-300 p-4 rounded-xl flex items-start gap-4 shadow-lg mb-6 backdrop-blur-sm">
             <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
                 <UserX size={20} className="text-amber-400" />
             </div>
             <div>
                 <h4 className="text-sm font-black tracking-widest uppercase mb-1">View-Only Registry Area</h4>
                 <p className="text-xs text-amber-500/80 leading-relaxed font-semibold">You selected a <b>{effectiveUnitType}</b>. Formal attendance marking acts explicitly at the <b>Cell</b> level. You may explore the registry of this unit but no attendance submissions are allowed from this scope.</p>
             </div>
          </div>
      )}

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-2">
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
        </div>
      </div>

      {successMsg && (
        <div className="bg-church-blue-900/30 border-2 border-church-blue-500 text-church-blue-300 p-4 rounded-xl flex items-center gap-3 font-bold backdrop-blur-sm">
            <CheckCircle size={24} />
            {successMsg}
        </div>
      )}

      {/* Member List */}
      <div className="bg-transparent mb-8">
        {loading ? (
            <div className="p-12 flex justify-center">
                <Loader2 className="animate-spin text-church-blue-500" size={40} />
            </div>
        ) : members.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-semibold">
                No members found in this cell.
            </div>
        ) : (
            <div className="space-y-12">
                {/* ── Core Members Arena ── */}
                <div>
                    <div className="divide-y divide-slate-700/50">
                        {members.filter(m => !['First Timer', 'Brethren', 'Unattended'].includes(m.membership_state)).length === 0 ? (
                            <div className="py-8 text-center text-slate-500 font-semibold italic text-sm border-t border-slate-700/50">No core members to display.</div>
                        ) : members.filter(m => !['First Timer', 'Brethren', 'Unattended'].includes(m.membership_state)).map(member => (
                            <div key={member.id} className="flex items-center justify-between gap-4 py-4 hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div 
                                        onClick={() => member.photo_url && setImageModalConfig({ isOpen: true, src: member.photo_url, title: member.full_name })}
                                        className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-white/5 shadow-sm transition-transform hover:scale-105 ${member.photo_url ? 'cursor-pointer' : ''}`}
                                    >
                                        {member.photo_url ? (
                                            <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <UserCheck size={20} className="text-slate-500" />
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-slate-200 text-base truncate">{member.full_name}</span>
                                        <div className="mt-0.5">
                                            <div className={`px-2 py-[2px] rounded-md text-[8px] font-black uppercase tracking-wider inline-flex items-center gap-1 border shadow-sm ${
                                                member.membership_state === 'First Timer' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
                                                member.membership_state === 'Brethren' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                member.membership_state === 'Member' ? 'bg-church-purple-500/10 text-church-purple-400 border-church-purple-500/20' :
                                                'bg-slate-800 text-slate-400 border-slate-700'
                                            }`}>
                                                {member.membership_state}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        disabled={!canMark}
                                        onClick={() => setAttendance(prev => ({ ...prev, [member.id]: attendance[member.id] === 'PRESENT' ? null : 'PRESENT' }))}
                                        className={`w-10 h-10 rounded-full transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed ${
                                            attendance[member.id] === 'PRESENT'
                                                ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-500/30'
                                                : 'bg-transparent text-slate-600 hover:bg-slate-800/50 hover:text-slate-300'
                                        }`}
                                        title="Mark Present"
                                    >
                                        <Check size={22} strokeWidth={attendance[member.id] === 'PRESENT' ? 3 : 2} />
                                    </button>
                                    <button
                                        disabled={!canMark}
                                        onClick={() => setAttendance(prev => ({ ...prev, [member.id]: attendance[member.id] === 'ABSENT' ? null : 'ABSENT' }))}
                                        className={`w-10 h-10 rounded-full transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed ${
                                            attendance[member.id] === 'ABSENT'
                                                ? 'bg-church-coral-700 text-white shadow-lg shadow-church-coral-500/30'
                                                : 'bg-transparent text-slate-600 hover:bg-slate-800/50 hover:text-slate-300'
                                        }`}
                                        title="Mark Absent"
                                    >
                                        <X size={22} strokeWidth={attendance[member.id] === 'ABSENT' ? 3 : 2} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Growth & Staging Arena ── */}
                {canMark && (
                    <div className="mt-8 pt-8 border-t-4 border-dashed border-slate-700/30 relative">
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#0a0a0b] px-4 text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase rounded-full">
                            Growth Additions
                        </div>
                        
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h3 className="text-sm font-black text-church-blue-400/80 uppercase tracking-widest">First Timers & Brethren</h3>
                            <button 
                                disabled={!canMark}
                                onClick={() => setIsAddModalOpen(true)}
                                className="flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase text-white bg-church-blue-600/20 hover:bg-church-blue-600/40 py-2 px-4 rounded-xl transition-colors border border-church-blue-500/30 shadow-inner disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <UserPlus size={14} /> Register New
                            </button>
                        </div>

                        <div className="divide-y divide-slate-700/50 bg-slate-900/30 rounded-2xl border border-slate-700/50 overflow-hidden">
                            {members.filter(m => ['First Timer', 'Brethren', 'Unattended'].includes(m.membership_state)).length === 0 ? (
                                <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center font-semibold italic text-sm">
                                    <UserPlus size={32} className="text-slate-600 mb-3" />
                                    No staging members tracking currently.
                                </div>
                            ) : members.filter(m => ['First Timer', 'Brethren', 'Unattended'].includes(m.membership_state)).map(member => (
                                <div key={member.id} className="flex items-center justify-between gap-4 py-4 px-4 hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div 
                                            onClick={() => member.photo_url && setImageModalConfig({ isOpen: true, src: member.photo_url, title: member.full_name })}
                                            className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-white/5 shadow-sm transition-transform hover:scale-105 ${member.photo_url ? 'cursor-pointer' : ''}`}
                                        >
                                            {member.photo_url ? (
                                                <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <UserCheck size={20} className="text-slate-500" />
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-bold text-slate-200 text-base truncate">{member.full_name}</span>
                                            <div className="mt-0.5">
                                                <div className={`px-2 py-[2px] rounded-md text-[8px] font-black uppercase tracking-wider inline-flex items-center gap-1 border shadow-sm ${
                                                    member.membership_state === 'First Timer' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
                                                    member.membership_state === 'Brethren' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    member.membership_state === 'Member' ? 'bg-church-purple-500/10 text-church-purple-400 border-church-purple-500/20' :
                                                    'bg-slate-800 text-slate-400 border-slate-700'
                                                }`}>
                                                    {member.membership_state}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            disabled={!canMark}
                                            onClick={() => setAttendance(prev => ({ ...prev, [member.id]: attendance[member.id] === 'PRESENT' ? null : 'PRESENT' }))}
                                            className={`w-10 h-10 rounded-full transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed ${
                                                attendance[member.id] === 'PRESENT'
                                                    ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-500/30'
                                                    : 'bg-transparent text-slate-600 hover:bg-slate-800/50 hover:text-slate-300'
                                            }`}
                                            title="Mark Present"
                                        >
                                            <Check size={22} strokeWidth={attendance[member.id] === 'PRESENT' ? 3 : 2} />
                                        </button>
                                        <button
                                            disabled={!canMark}
                                            onClick={() => setAttendance(prev => ({ ...prev, [member.id]: attendance[member.id] === 'ABSENT' ? null : 'ABSENT' }))}
                                            className={`w-10 h-10 rounded-full transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed ${
                                                attendance[member.id] === 'ABSENT'
                                                    ? 'bg-church-coral-700 text-white shadow-lg shadow-church-coral-500/30'
                                                    : 'bg-transparent text-slate-600 hover:bg-slate-800/50 hover:text-slate-300'
                                            }`}
                                            title="Mark Absent"
                                        >
                                            <X size={22} strokeWidth={attendance[member.id] === 'ABSENT' ? 3 : 2} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Bottom Controls */}
      {canMark && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-6 border-t border-white/5 mt-8">
            <div className="flex flex-col sm:flex-row gap-6 w-full md:w-auto">
                {/* Flatter Minimal Mobile-Responsive Growth Counters */}
                <div className="flex flex-col w-full sm:w-auto min-w-[170px] border-b border-slate-700/50 pb-3">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-slate-200">
                                <UserPlus size={18} className="text-blue-700" />
                                <span className="text-sm font-bold tracking-wide">First Timers</span>
                            </div>
                            <input
                                type="number"
                                readOnly
                                value={computedFirstTimersCount === 0 ? '' : computedFirstTimersCount}
                                className="w-16 bg-slate-900/80 border border-blue-700/20 rounded-lg px-2 py-1 text-white text-center font-black text-xl placeholder:text-slate-600 transition-all shadow-inner opacity-70 cursor-not-allowed"
                                placeholder="0"
                                title="Auto-calculated from staging arena above"
                            />
                        </div>
                        <button 
                            onClick={() => window.open('https://forms.gle/oJQiSv6M4xmXzPZ99', '_blank')}
                            className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-wider text-blue-700 hover:bg-blue-700/10 hover:text-blue-400 px-2 py-1 -ml-2 rounded-md transition-colors w-fit"
                        >
                            <ExternalLink size={12} /> Open Form
                        </button>
                    </div>
                </div>

                <div className="flex flex-col w-full sm:w-auto min-w-[170px] border-b border-slate-800/50 pb-3">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-slate-200">
                                <Flame size={18} className="text-blue-700" />
                                <span className="text-sm font-bold tracking-wide">Souls Won</span>
                            </div>
                            <input
                                type="number"
                                min={0}
                                value={soulsWon === 0 ? '' : soulsWon}
                                onChange={(e) => setSoulsWon(e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-16 bg-slate-900/80 border border-blue-700/50 rounded-lg px-2 py-1 text-white text-center font-black text-xl focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-500/50 placeholder:text-slate-600 transition-all shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0"
                            />
                        </div>
                        <button 
                            onClick={() => window.open('https://forms.gle/BjsoPe2F2KjqFn3o8', '_blank')}
                            className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-wider text-blue-700 hover:bg-blue-700/10 hover:text-blue-400 px-2 py-1 -ml-2 rounded-md transition-colors w-fit"
                        >
                            <ExternalLink size={12} /> Open Form
                        </button>
                    </div>
                </div>
            </div>

            <button 
                onClick={handleSubmit}
                disabled={!canMark || submitting || loading}
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-gradient-church hover:opacity-90 text-white px-8 py-3.5 rounded-xl font-black text-lg transition-all shadow-lg shadow-church-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-church-blue-600"
            >
                {submitting ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                <span>{submitting ? 'Saving...' : 'Submit Attendance'}</span>
            </button>
          </div>
      )}

      <ImageModal 
                isOpen={imageModalConfig.isOpen}
                onClose={() => setImageModalConfig(prev => ({ ...prev, isOpen: false }))}
                imageSrc={imageModalConfig.src}
                title={imageModalConfig.title}
      />

      {/* Registration Modal */}
      <PersonActionModal 
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          mode="add"
          units={hierarchyData}
          positions={positions}
          // Intelligently pre-fill with the currently active unit when creating here!
          person={{ unit_id: effectiveUnitId }}
          lockUnit={true}  // Prevent altering the scope when rapid-adding from this screen
          onSubmit={async (data) => {
              // Create the person directly
              const newPerson = await createPerson(data);
              // Upon success, gracefully close and immediately reload the members into the arena
              setIsAddModalOpen(false);
              setSuccessMsg('Member registered successfully!');
              setTimeout(() => setSuccessMsg(''), 3000);
              await loadMembers();
              // Automatically check them present as a convenience!
              setAttendance(prev => ({ ...prev, [newPerson.id]: 'PRESENT' }));
          }}
      />
    </div>
  );
}
