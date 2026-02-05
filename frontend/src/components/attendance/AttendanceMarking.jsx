import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Save, UserCheck, UserX, Loader2, CheckCircle, Users } from 'lucide-react';

export default function AttendanceMarking({ currentRole }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attendance, setAttendance] = useState({}); // { personId: 'PRESENT' | 'ABSENT' }
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch members for the selected unit
  useEffect(() => {
    async function fetchMembers() {
      if (!currentRole.unitName) return;
      
      setLoading(true);
      try {
        // 1. Get Unit ID first (since we are simulating with just names in the parent)
        const { data: unitData, error: unitError } = await supabase
          .from('organizational_units')
          .select('id')
          .eq('name', currentRole.unitName)
          .single();
          
        if (unitError) throw unitError;
        
        // 2. Get Members of this unit
        const { data: memberData, error: memberError } = await supabase
          .from('position_assignments')
          .select(`
            person_id,
            people ( id, full_name, photo_url, is_active )
          `)
          .eq('unit_id', unitData.id)
          .eq('is_active', true);

        if (memberError) throw memberError;

        const formattedMembers = memberData
          .map(m => m.people)
          .filter(p => p.is_active) // Double check active
          .sort((a, b) => a.full_name.localeCompare(b.full_name));

        setMembers(formattedMembers);
        
        // Initialize all as PRESENT by default (common use case)
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
  }, [currentRole.unitName]);

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
        // 1. Get Unit ID
        const { data: unitData } = await supabase
          .from('organizational_units')
          .select('id')
          .eq('name', currentRole.unitName)
          .single();

        if (!unitData) throw new Error("Unit not found");

        // 2. Create/Get Session
        // We use upsert to handle re-submission for same day
        const { data: sessionData, error: sessionError } = await supabase
            .from('attendance_sessions')
            .upsert({
                unit_id: unitData.id,
                session_date: date,
                created_by: null // In real app, would be current user ID
            }, { onConflict: 'unit_id, session_date' })
            .select()
            .single();

        if (sessionError) throw sessionError;

        // 3. Create Records
        const records = members.map(m => ({
            session_id: sessionData.id,
            person_id: m.id,
            status: attendance[m.id] || 'ABSENT'
        }));

        const { error: recordsError } = await supabase
            .from('attendance_records')
            .upsert(records, { onConflict: 'session_id, person_id' });

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

  if (currentRole.unitType !== 'CELL') {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <UserX size={48} className="mb-4 opacity-50" />
            <p className="text-lg">Attendance marking is primarily for Cell Shepherds.</p>
            <p className="text-sm">Please switch role to "Cell Shepherd" to test this feature.</p>
        </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
        <div className="flex items-center gap-4">
            <div className="flex flex-col">
                <label className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1">Session Date</label>
                <div className="relative">
                    <input 
                        type="date" 
                        value={date}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                </div>
            </div>
            <div className="flex flex-col">
                <label className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1">Unit</label>
                <span className="text-white font-medium px-3 py-2 bg-slate-900 rounded-lg border border-slate-700/50">
                    {currentRole.unitName}
                </span>
            </div>
        </div>

        <button 
            onClick={handleSubmit}
            disabled={submitting || loading}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            <span>{submitting ? 'Saving...' : 'Submit Attendance'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3">
            <CheckCircle size={20} />
            {successMsg}
        </div>
      )}

      {/* Member List */}
      <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 overflow-hidden">
        {loading ? (
            <div className="p-12 flex justify-center">
                <Loader2 className="animate-spin text-emerald-500" size={32} />
            </div>
        ) : members.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
                No members found in this cell.
            </div>
        ) : (
            <div className="divide-y divide-slate-700/50">
                <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-slate-800/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <div className="col-span-8">Member Name</div>
                    <div className="col-span-4 text-center">Status</div>
                </div>
                {members.map(member => (
                    <div key={member.id} className="flex flex-col md:grid md:grid-cols-12 gap-4 p-4 items-center hover:bg-slate-800/30 transition-colors border-b border-slate-700/50 md:border-none">
                        <div className="w-full md:col-span-8 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden shrink-0 border border-slate-600">
                                {member.photo_url ? (
                                    <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                                        <Users size={20} />
                                    </div>
                                )}
                            </div>
                            <span className="font-medium text-slate-200">{member.full_name}</span>
                        </div>
                        <div className="w-full md:col-span-4 flex justify-between md:justify-center gap-2">
                            <button
                                onClick={() => toggleStatus(member.id)}
                                className={`
                                    relative flex items-center gap-2 px-4 py-1.5 rounded-full font-medium text-sm transition-all
                                    ${attendance[member.id] === 'PRESENT' 
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    }
                                `}
                            >
                                {attendance[member.id] === 'PRESENT' ? (
                                    <>
                                        <UserCheck size={16} />
                                        <span>Present</span>
                                    </>
                                ) : (
                                    <>
                                        <UserX size={16} />
                                        <span>Absent</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

    </div>
  );
}
