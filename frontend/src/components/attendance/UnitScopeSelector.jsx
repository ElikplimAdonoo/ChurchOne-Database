import { useState, useEffect } from 'react';
import { fetchHierarchyData } from '../../services/hierarchyService';
import { ChevronRight, LayoutGrid, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function UnitScopeSelector({ userRole, onScopeChange }) {
    const { getManagedUnits } = useAuth();
    const [units, setUnits] = useState([]);
    const [managedUnits, setManagedUnits] = useState(new Set());
    const [loading, setLoading] = useState(true);

    // Selected states
    const [selectedZone, setSelectedZone] = useState('');
    const [selectedMC, setSelectedMC] = useState('');
    const [selectedBuscenta, setSelectedBuscenta] = useState('');
    const [selectedCell, setSelectedCell] = useState('');

    useEffect(() => {
        if (!userRole) return;
        
        // If CELL leader, no selector needed. Auto-fire scope and exit.
        if (userRole.unitType === 'CELL') {
            onScopeChange(userRole.unitId, 'CELL', userRole.unitName);
            setLoading(false);
            return;
        }

        async function loadData() {
            try {
                const [allUnits, managedSet] = await Promise.all([
                    fetchHierarchyData(),
                    getManagedUnits()
                ]);
                
                const allowedUnits = managedSet === 'ALL' 
                    ? allUnits 
                    : allUnits.filter(u => managedSet.has(u.id));

                setUnits(allowedUnits);
                setManagedUnits(managedSet);

                // Initialize starting scope based on user role
                const myUnit = allowedUnits.find(u => u.id === userRole.unitId);
                
                if (myUnit) {
                    // Pre-select based on their level
                    if (myUnit.unit_type === 'ZONE') setSelectedZone(myUnit.id);
                    if (myUnit.unit_type === 'MC') {
                        // Find this MC's zone parent (if it's in allowed list)
                        const parentZone = allowedUnits.find(u => u.id === myUnit.parent_id);
                        if (parentZone) setSelectedZone(parentZone.id);
                        setSelectedMC(myUnit.id);
                    }
                    if (myUnit.unit_type === 'BUSCENTA') {
                        const parentMC = allowedUnits.find(u => u.id === myUnit.parent_id);
                        if (parentMC) {
                            setSelectedMC(parentMC.id);
                            const parentZone = allowedUnits.find(u => u.id === parentMC.parent_id);
                            if (parentZone) setSelectedZone(parentZone.id);
                        }
                        setSelectedBuscenta(myUnit.id);
                    }
                    
                    // Dispatch initial scope
                    onScopeChange(myUnit.id, myUnit.unit_type, myUnit.name);
                }
            } catch (error) {
                console.error("Failed to load unit scope data:", error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [userRole, getManagedUnits]);

    // Handle emitting the lowest selected scope to parent
    useEffect(() => {
        if (loading || units.length === 0) return;

        let activeId = userRole.unitId;
        let activeType = userRole.unitType;
        let activeName = userRole.unitName;

        if (selectedCell) {
            activeId = selectedCell;
            activeType = 'CELL';
        } else if (selectedBuscenta) {
            activeId = selectedBuscenta;
            activeType = 'BUSCENTA';
        } else if (selectedMC) {
            activeId = selectedMC;
            activeType = 'MC';
        } else if (selectedZone) {
            activeId = selectedZone;
            activeType = 'ZONE';
        }

        const unitObj = units.find(u => u.id === activeId);
        
        // If we found a unit (Zonal/MC), use its names.
        // If not (e.g., cleared back to Admin defaults), bubble up the original userRole values.
        if (unitObj) {
            onScopeChange(activeId, activeType, unitObj.name);
        } else {
            onScopeChange(activeId, activeType, activeName);
        }

    }, [selectedZone, selectedMC, selectedBuscenta, selectedCell, units, loading]);

    if (userRole?.unitType === 'CELL') return null; // Hide completely for cell leaders
    if (loading) return <div className="h-14 animate-pulse bg-slate-800/50 rounded-xl border border-slate-700"></div>;

    // Derived dropdown options sorted naturally/chronologically (e.g. Zone 1 -> Zone 2 -> Zone 10)
    const sortByName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });

    const targetZones = units.filter(u => u.unit_type === 'ZONE').sort(sortByName);
    const targetMCs = units.filter(u => u.unit_type === 'MC' && u.parent_id === selectedZone).sort(sortByName);
    const targetBuscentas = units.filter(u => u.unit_type === 'BUSCENTA' && u.parent_id === selectedMC).sort(sortByName);
    const targetCells = units.filter(u => u.unit_type === 'CELL' && u.parent_id === selectedBuscenta).sort(sortByName);

    return (
        <div className="space-y-3 mb-6">
            <h3 className="text-lg font-black text-slate-200">Scope</h3>

            <div className="space-y-3">
                {/* ZONE */}
                {(targetZones.length > 0 || selectedZone) && (
                    <div className="relative">
                        <LayoutGrid size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-church-blue-400 pointer-events-none" />
                        <select
                            value={selectedZone}
                            onChange={(e) => {
                                setSelectedZone(e.target.value);
                                setSelectedMC('');
                                setSelectedBuscenta('');
                                setSelectedCell('');
                            }}
                            disabled={targetZones.length <= 1}
                            className="w-full bg-[#0b1120] border border-slate-600/60 rounded-2xl pl-12 pr-10 py-4 text-sm font-bold text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-church-blue-500/50 focus:border-church-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <option value="">-- All Zones --</option>
                            {targetZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                        </select>
                        <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" />
                    </div>
                )}

                {/* MC */}
                {(targetMCs.length > 0 || selectedMC) && selectedZone && (
                    <div className="relative">
                        <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-church-blue-400 pointer-events-none" />
                        <select
                            value={selectedMC}
                            onChange={(e) => {
                                setSelectedMC(e.target.value);
                                setSelectedBuscenta('');
                                setSelectedCell('');
                            }}
                            className="w-full bg-[#0b1120] border border-slate-600/60 rounded-2xl pl-12 pr-10 py-4 text-sm font-bold text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-church-blue-500/50 focus:border-church-blue-500/50 transition-colors"
                        >
                            <option value="">-- All MCs --</option>
                            {targetMCs.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" />
                    </div>
                )}

                {/* BUSCENTA */}
                {(targetBuscentas.length > 0 || selectedBuscenta) && selectedMC && (
                    <div className="relative">
                        <LayoutGrid size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-church-blue-400 pointer-events-none" />
                        <select
                            value={selectedBuscenta}
                            onChange={(e) => {
                                setSelectedBuscenta(e.target.value);
                                setSelectedCell('');
                            }}
                            className="w-full bg-[#0b1120] border border-slate-600/60 rounded-2xl pl-12 pr-10 py-4 text-sm font-bold text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-church-blue-500/50 focus:border-church-blue-500/50 transition-colors"
                        >
                            <option value="">-- All Buscentas --</option>
                            {targetBuscentas.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" />
                    </div>
                )}

                {/* CELL */}
                {(targetCells.length > 0 || selectedCell) && selectedBuscenta && (
                    <div className="relative">
                        <LayoutGrid size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-church-blue-400 pointer-events-none" />
                        <select
                            value={selectedCell}
                            onChange={(e) => setSelectedCell(e.target.value)}
                            className="w-full bg-[#0b1120] border border-slate-600/60 rounded-2xl pl-12 pr-10 py-4 text-sm font-bold text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-church-blue-500/50 focus:border-church-blue-500/50 transition-colors"
                        >
                            <option value="">-- All Cells --</option>
                            {targetCells.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" />
                    </div>
                )}
            </div>
        </div>
    );
}
