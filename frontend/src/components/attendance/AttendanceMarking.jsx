import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, UserCheck, UserX, Loader2, CheckCircle, XCircle, Check, X, UserPlus, Flame, ExternalLink, Share2, LayoutGrid, ChevronDown, Clock, AlertTriangle, Calendar } from 'lucide-react';
import ImageModal from '../common/ImageModal';
import PersonActionModal from '../PersonActionModal';
import { fetchHierarchyData, fetchPositions } from '../../services/hierarchyService';
import { createFirstTimer } from '../../services/peopleService';
import { cacheService, CACHE_KEYS } from '../../services/cacheService';

// ─── Service Type Definitions ────────────────────────────────────────────────
const SERVICE_TYPES = [
  { value: 'Mega Gathering Service', label: 'Mega Gathering Service', days: [0, 6] }, // Sunday=0, Saturday=6
  { value: 'LC Live', label: 'LC Live', days: [3] }, // Wednesday=3
  { value: 'Special Meeting', label: 'Special Meeting', days: null }, // Any day
];

// ─── Date & Deadline Helpers ─────────────────────────────────────────────────
function getServiceDate(serviceValue) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentDay = today.getDay(); // 0=Sun, 1=Mon, ... 6=Sat

  if (serviceValue === 'Mega Gathering Service') {
    const result = new Date(today);
    // Sunday (0) maps to today, Monday (1) maps to yesterday. All other days map to the previous Sunday.
    result.setDate(result.getDate() - currentDay);
    return result;
  } else if (serviceValue === 'LC Live') {
    // LC Live is Wednesday.
    const result = new Date(today);
    if (currentDay >= 3 && currentDay <= 6) {
      // Wed to Sat: map to the Wed of this week
      result.setDate(result.getDate() - (currentDay - 3));
    } else {
      // Sun(0) to Tue(2): map to the PREVIOUS Wed
      // Sun(0): go back 4 days. Mon(1): go back 5 days. Tue(2): go back 6 days.
      result.setDate(result.getDate() - currentDay - 4);
    }
    return result;
  } else {
    // Special Meeting: today
    return today;
  }
}

function getDeadline(serviceValue, serviceDate) {
  const deadline = new Date(serviceDate);
  if (serviceValue === 'Mega Gathering Service') {
    // 24 hours after Sunday = end of Monday (11:59:59 PM)
    deadline.setDate(deadline.getDate() + 1);
    deadline.setHours(23, 59, 59, 999);
  } else if (serviceValue === 'LC Live') {
    // End of Saturday of that week
    // Wednesday + 3 days = Saturday
    deadline.setDate(deadline.getDate() + 3);
    deadline.setHours(23, 59, 59, 999);
  } else {
    // Special Meeting: 24 hours from the service date
    deadline.setDate(deadline.getDate() + 1);
    deadline.setHours(23, 59, 59, 999);
  }
  return deadline;
}

function isDeadlinePassed(serviceValue, serviceDate) {
  const deadline = getDeadline(serviceValue, serviceDate);
  return new Date() > deadline;
}

function formatDateShort(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function toISODate(date) {
  // Returns YYYY-MM-DD in local time
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function AttendanceMarking({ currentRole, overrideUnitId = null, overrideUnitType = null }) {
  const [serviceType, setServiceType] = useState('Mega Gathering Service');
  const [specialMeetingName, setSpecialMeetingName] = useState('');
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

  // Derived: compute the session date and deadline from serviceType
  const serviceDate = useMemo(() => getServiceDate(serviceType), [serviceType]);
  const date = useMemo(() => toISODate(serviceDate), [serviceDate]);
  const deadlinePassed = useMemo(() => isDeadlinePassed(serviceType, serviceDate), [serviceType, serviceDate]);
  const deadline = useMemo(() => getDeadline(serviceType, serviceDate), [serviceType, serviceDate]);
  const resolvedServiceName = serviceType === 'Special Meeting' ? specialMeetingName.trim() : serviceType;
  const isSpecialMeetingInvalid = serviceType === 'Special Meeting' && !specialMeetingName.trim();

  const handleFirstTimersChange = (val) => {
    const newVal = Math.max(0, parseInt(val) || 0);
    setFirstTimers(newVal);
  };

  // Use overrideUnitId (when a higher-level leader picks a cell), else fall back to own unit
  const effectiveUnitId = overrideUnitId || currentRole.unitId;
  const effectiveUnitType = overrideUnitType || currentRole.unitType;
  
  const isDirectUnit = effectiveUnitId === currentRole.unitId;
  const canMark = isDirectUnit || currentRole.unitType === 'MC';
  const isGeneralMarkingLevel = ['CELL', 'MC'].includes(effectiveUnitType);

  const computedFirstTimersCount = useMemo(() => {
    return members
       .filter(m => m.role === 'First Timer' || ['First Timer', 'Brethren', 'Unattended'].includes(m.membership_state))
       .filter(m => attendance[m.id] === 'PRESENT')
       .length;
  }, [members, attendance]);

  useEffect(() => {
    fetchHierarchyData().then(setHierarchyData);
    fetchPositions().then(setPositions);
  }, []);

  const loadMembers = async (preserveLocal = false) => {
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

        // Fetch session first (if it exists)
        let existingRecords = {};
        if (effectiveUnitId && date && resolvedServiceName) {
            const { data: sessionData } = await supabase
                .from('attendance_sessions')
                .select('id')
                .eq('unit_id', effectiveUnitId)
                .eq('session_date', date)
                .eq('service_name', resolvedServiceName)
                .maybeSingle();

            if (sessionData) {
                const { data: recordsData } = await supabase
                    .from('attendance_records')
                    .select('person_id, status')
                    .eq('session_id', sessionData.id);
                if (recordsData) {
                    recordsData.forEach(r => {
                        existingRecords[r.person_id] = r.status;
                    });
                }
            }
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
             
             if (roleTitle === 'Member' || roleTitle === 'Cell Member' || roleTitle === 'First Timer' || roleTitle === 'Unassigned') {
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
             
             return { ...p, role: roleTitle, membership_state, present_count: presentCount };
          })
          .filter(p => p && p.is_active)
          .sort((a, b) => a.full_name.localeCompare(b.full_name));

        setMembers(formattedMembers);
        
        // Initialize status, preserving any unsaved local marks if requested
        setAttendance(prev => {
            const nextStatus = preserveLocal ? { ...prev } : {};
            formattedMembers.forEach(m => {
                if (!preserveLocal || nextStatus[m.id] === undefined) {
                    nextStatus[m.id] = existingRecords[m.id] !== undefined ? existingRecords[m.id] : null;
                }
            });
            return nextStatus;
        });

      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    loadMembers(false);
  }, [effectiveUnitId, date, resolvedServiceName]);

  // When service type changes, load existing session growth counts (if session exists)
  useEffect(() => {
    if (!effectiveUnitId || !date || !resolvedServiceName) return;
    async function loadSessionCounts() {
      const { data } = await supabase
        .from('attendance_sessions')
        .select('first_timers_count, souls_won_count')
        .eq('unit_id', effectiveUnitId)
        .eq('session_date', date)
        .eq('service_name', resolvedServiceName)
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
  }, [effectiveUnitId, date, resolvedServiceName]);

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

    // Deadline guard
    if (deadlinePassed) {
        alert('The deadline for this service has passed. Attendance can no longer be submitted.');
        return;
    }

    // Special meeting name guard
    if (isSpecialMeetingInvalid) {
        alert('Please provide a name for the Special Meeting before submitting.');
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
                service_name: resolvedServiceName,
                created_by: currentRole.personId || null,
                first_timers_count: computedFirstTimersCount,
                souls_won_count: soulsWon,
            }, { onConflict: 'unit_id,session_date,service_name' })
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

        // Invalidate people and hierarchy caches so that promotions/state changes are reflected
        cacheService.remove(CACHE_KEYS.PEOPLE);
        cacheService.remove(CACHE_KEYS.HIERARCHY);

        setSuccessMsg('Attendance marked successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);

    } catch (error) {
        console.error("Error submitting attendance:", error);
        alert("Failed to submit attendance: " + (error.message || JSON.stringify(error)));
    } finally {
        setSubmitting(false);
    }
  };

  // If not a cell, we render them in view-only mode
  return (
    <div className="space-y-6">


      {/* Service Selector */}
      <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 uppercase font-black tracking-wider">Service Type</label>
              <div className="relative">
                  <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 text-church-blue-400 pointer-events-none" size={18} />
                  <select
                      value={serviceType}
                      onChange={(e) => { setServiceType(e.target.value); setSpecialMeetingName(''); }}
                      style={{ backgroundColor: '#0f172a' }}
                      className="w-full border border-slate-600/60 rounded-2xl pl-12 pr-10 py-3.5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-church-blue-500/50 focus:border-church-blue-500/50 transition-colors appearance-none [color-scheme:dark]"
                  >
                      {SERVICE_TYPES.map(st => (
                          <option key={st.value} value={st.value} style={{ backgroundColor: '#0f172a', color: '#e2e8f0' }}>{st.label}</option>
                      ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
              </div>
          </div>

          {/* Special Meeting Name (compulsory) */}
          {serviceType === 'Special Meeting' && (
              <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 uppercase font-black tracking-wider">Meeting Name <span className="text-church-coral-400">*</span></label>
                  <input
                      type="text"
                      value={specialMeetingName}
                      onChange={(e) => setSpecialMeetingName(e.target.value)}
                      placeholder="e.g. Easter Convention, Youth Rally..."
                      className={`w-full bg-transparent border rounded-2xl px-4 py-3.5 text-sm font-bold text-white focus:outline-none focus:ring-2 transition-colors placeholder:text-slate-600 ${
                          isSpecialMeetingInvalid 
                              ? 'border-church-coral-500/60 focus:ring-church-coral-500/50 focus:border-church-coral-500/50' 
                              : 'border-slate-600/60 focus:ring-church-blue-500/50 focus:border-church-blue-500/50'
                      }`}
                  />
                  {isSpecialMeetingInvalid && (
                      <p className="text-[10px] font-bold text-church-coral-400 ml-1 flex items-center gap-1">
                          <AlertTriangle size={10} /> A name is required before you can submit attendance.
                      </p>
                  )}
              </div>
          )}

          {/* Auto-computed date & deadline info */}
          <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
                  <Calendar size={12} className="text-slate-600" />
                  <span>{formatDateShort(serviceDate)}</span>
              </div>
              {deadlinePassed ? (
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-church-coral-400 uppercase tracking-wider">
                      <XCircle size={12} /> Deadline Passed
                  </div>
              ) : (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                      <Clock size={12} /> Closes {deadline.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
              )}
          </div>
      </div>

      {/* Deadline Passed Banner */}
      {deadlinePassed && canMark && (
          <div className="flex items-start gap-3 border border-church-coral-500/30 bg-church-coral-500/5 rounded-2xl p-4">
              <AlertTriangle size={20} className="text-church-coral-400 shrink-0 mt-0.5" />
              <p className="text-sm text-church-coral-300 font-medium leading-relaxed">
                  The submission window for <span className="font-black">{serviceType}</span> ({formatDateShort(serviceDate)}) has closed. You can no longer mark attendance for this service.
              </p>
          </div>
      )}

      {successMsg && (
        <div className="bg-church-blue-900/30 border-2 border-church-blue-500 text-church-blue-300 p-4 rounded-xl flex items-center gap-3 font-bold backdrop-blur-sm">
            <CheckCircle size={24} />
            {successMsg}
        </div>
      )}

      {/* Member List */}
      <div className="mb-8">
        {loading ? (
            <div className="p-12 flex justify-center">
                <Loader2 className="animate-spin text-church-blue-500" size={40} />
            </div>
        ) : members.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-semibold">
                No members found in this cell.
            </div>
        ) : (
            <div className="space-y-10">
                {/* ── Core Members Arena ── */}
                <div>
                    <div className="space-y-2">
                        {members.filter(m => !['First Timer', 'Brethren', 'Unattended'].includes(m.membership_state)).length === 0 ? (
                            <div className="py-8 text-center text-slate-500 font-semibold italic text-sm border-t border-slate-700/50">No core members to display.</div>
                        ) : members.filter(m => !['First Timer', 'Brethren', 'Unattended'].includes(m.membership_state)).map(member => (
                            <div key={member.id} className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border border-slate-700/40 hover:border-slate-600/60 hover:bg-white/[0.01] transition-all">
                                <div className="flex items-center gap-3 min-w-0">
                                    {/* Avatar/Photo */}
                                    <div 
                                        onClick={() => member.photo_url && setImageModalConfig({ isOpen: true, src: member.photo_url, title: member.full_name })}
                                        className={`w-9 h-9 md:w-10 md:h-10 rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-white/5 shadow-sm transition-transform hover:scale-105 ${member.photo_url ? 'cursor-pointer' : ''}`}
                                    >
                                        {member.photo_url ? (
                                            <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <UserCheck size={18} className="text-slate-500" />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-slate-200 text-sm md:text-base truncate leading-snug">{member.full_name}</span>
                                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
                                            {/* Placeholder badge */}
                                            {member.is_placeholder && (
                                                <div className="text-[7px] text-amber-500 font-black uppercase tracking-wider flex items-center gap-0.5">
                                                    <span className="w-1 h-1 bg-amber-500 rounded-full animate-pulse"></span> Virtual Placeholder
                                                </div>
                                            )}

                                            {/* Role title — single blue badge only */}
                                            {member.role && member.role !== 'Unassigned' && (
                                                <span className="text-church-blue-400 font-black text-[8px] uppercase tracking-wider">{member.role}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Present/Absent actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        disabled={!canMark}
                                        onClick={() => setAttendance(prev => ({ ...prev, [member.id]: attendance[member.id] === 'PRESENT' ? null : 'PRESENT' }))}
                                        className={`w-8 h-8 md:w-9 md:h-9 rounded-full transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed ${
                                            attendance[member.id] === 'PRESENT'
                                                ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-500/30'
                                                : 'bg-transparent text-slate-600 hover:bg-slate-800/50 hover:text-slate-300'
                                        }`}
                                        title="Mark Present"
                                    >
                                        <Check size={18} strokeWidth={attendance[member.id] === 'PRESENT' ? 3 : 2} />
                                    </button>
                                    <button
                                        disabled={!canMark}
                                        onClick={() => setAttendance(prev => ({ ...prev, [member.id]: attendance[member.id] === 'ABSENT' ? null : 'ABSENT' }))}
                                        className={`w-8 h-8 md:w-9 md:h-9 rounded-full transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed ${
                                            attendance[member.id] === 'ABSENT'
                                                ? 'bg-church-coral-700 text-white shadow-lg shadow-church-coral-500/30'
                                                : 'bg-transparent text-slate-600 hover:bg-slate-800/50 hover:text-slate-300'
                                        }`}
                                        title="Mark Absent"
                                    >
                                        <X size={18} strokeWidth={attendance[member.id] === 'ABSENT' ? 3 : 2} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Growth & Staging Arena ── */}
                {canMark && isGeneralMarkingLevel && (
                    <div id="first-timers-section" className="mt-8 pt-8 border-t-4 border-dashed border-slate-700/30 relative">
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#0a0a0b] px-4 text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase rounded-full">
                            Growth Additions
                        </div>
                        
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h3 className="text-sm font-black text-church-blue-400/80 uppercase tracking-widest">First Timers</h3>
                            <button 
                                disabled={!canMark}
                                onClick={() => setIsAddModalOpen(true)}
                                className="flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase text-white bg-church-blue-600/20 hover:bg-church-blue-600/40 py-2 px-4 rounded-xl transition-colors border border-church-blue-500/30 shadow-inner disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <UserPlus size={14} /> Register New
                            </button>
                        </div>

                        <div className="space-y-2">
                            {members.filter(m => ['First Timer', 'Brethren', 'Unattended'].includes(m.membership_state)).length === 0 ? (
                                <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center font-semibold italic text-sm">
                                    <UserPlus size={32} className="text-slate-600 mb-3" />
                                    No staging members tracking currently.
                                </div>
                            ) : members.filter(m => ['First Timer', 'Brethren', 'Unattended'].includes(m.membership_state)).map(member => (
                                <div key={member.id} className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border border-slate-700/40 hover:border-slate-600/60 hover:bg-white/[0.01] transition-all">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {/* Avatar/Photo */}
                                        <div 
                                            onClick={() => member.photo_url && setImageModalConfig({ isOpen: true, src: member.photo_url, title: member.full_name })}
                                            className={`w-9 h-9 md:w-10 md:h-10 rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-white/5 shadow-sm transition-transform hover:scale-105 ${member.photo_url ? 'cursor-pointer' : ''}`}
                                        >
                                            {member.photo_url ? (
                                                <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <UserCheck size={18} className="text-slate-500" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-bold text-slate-200 text-sm md:text-base truncate leading-snug">{member.full_name}</span>
                                            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
                                                {/* Placeholder badge */}
                                                {member.is_placeholder && (
                                                    <div className="text-[7px] text-amber-500 font-black uppercase tracking-wider flex items-center gap-0.5">
                                                        <span className="w-1 h-1 bg-amber-500 rounded-full animate-pulse"></span> Virtual Placeholder
                                                    </div>
                                                )}

                                                {/* Role title — single blue badge only */}
                                                {member.role && member.role !== 'Unassigned' && (
                                                    <span className="text-church-blue-400 font-black text-[8px] uppercase tracking-wider">{member.role}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Present/Absent actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            disabled={!canMark}
                                            onClick={() => setAttendance(prev => ({ ...prev, [member.id]: attendance[member.id] === 'PRESENT' ? null : 'PRESENT' }))}
                                            className={`w-8 h-8 md:w-9 md:h-9 rounded-full transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed ${
                                                attendance[member.id] === 'PRESENT'
                                                    ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-500/30'
                                                    : 'bg-transparent text-slate-600 hover:bg-slate-800/50 hover:text-slate-300'
                                            }`}
                                            title="Mark Present"
                                        >
                                            <Check size={18} strokeWidth={attendance[member.id] === 'PRESENT' ? 3 : 2} />
                                        </button>
                                        <button
                                            disabled={!canMark}
                                            onClick={() => setAttendance(prev => ({ ...prev, [member.id]: attendance[member.id] === 'ABSENT' ? null : 'ABSENT' }))}
                                            className={`w-8 h-8 md:w-9 md:h-9 rounded-full transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed ${
                                                attendance[member.id] === 'ABSENT'
                                                    ? 'bg-church-coral-700 text-white shadow-lg shadow-church-coral-500/30'
                                                    : 'bg-transparent text-slate-600 hover:bg-slate-800/50 hover:text-slate-300'
                                            }`}
                                            title="Mark Absent"
                                        >
                                            <X size={18} strokeWidth={attendance[member.id] === 'ABSENT' ? 3 : 2} />
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
          <div className={`flex flex-col md:flex-row md:items-center ${isGeneralMarkingLevel ? 'justify-between' : 'justify-end'} gap-6 py-6 border-t border-white/5 mt-8`}>
            {isGeneralMarkingLevel && (
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
                                value={computedFirstTimersCount || firstTimers || ''}
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
            )}

            <button 
                onClick={handleSubmit}
                disabled={!canMark || submitting || loading || deadlinePassed || isSpecialMeetingInvalid}
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
              // Create the person directly (No auth login generated)
              const newPerson = await createFirstTimer(data);
              // Upon success, gracefully close and immediately reload the members into the arena
              setIsAddModalOpen(false);
              setSuccessMsg('Member registered successfully!');
              setTimeout(() => setSuccessMsg(''), 3000);
              await loadMembers();
              // Automatically check them present as a convenience!
              setAttendance(prev => ({ ...prev, [newPerson.person.id]: 'PRESENT' }));
          }}
      />
    </div>
  );
}
