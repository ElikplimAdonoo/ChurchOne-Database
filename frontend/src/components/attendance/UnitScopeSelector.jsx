import { useState, useEffect } from 'react';
import { fetchHierarchyData } from '../../services/hierarchyService';
import { ChevronRight, LayoutGrid } from 'lucide-react';
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

    // Derived dropdown options
    const targetZones = units.filter(u => u.unit_type === 'ZONE');
    const targetMCs = units.filter(u => u.unit_type === 'MC' && u.parent_id === selectedZone);
    const targetBuscentas = units.filter(u => u.unit_type === 'BUSCENTA' && u.parent_id === selectedMC);
    const targetCells = units.filter(u => u.unit_type === 'CELL' && u.parent_id === selectedBuscenta);

    return (
        <div className="bg-slate-900/60 p-4 rounded-2xl shadow-lg backdrop-blur-md mb-6">
            <div className="flex items-center gap-2 mb-3">
                <LayoutGrid size={16} className="text-church-blue-400" />
                <h3 className="text-sm font-bold text-slate-200">Scope Selection</h3>
                <span className="text-xs text-slate-500 font-medium ml-2">Drill down into your structure to view analytics or mark attendance.</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {/* ZONE */}
                {(targetZones.length > 0 || selectedZone) && (
                    <div className="flex-1 min-w-[200px]">
                        <select
                            value={selectedZone}
                            onChange={(e) => {
                                setSelectedZone(e.target.value);
                                setSelectedMC('');
                                setSelectedBuscenta('');
                                setSelectedCell('');
                            }}
                            disabled={targetZones.length <= 1} // Auto-lock if they only manage 1 zone
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-church-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="">-- All Zones --</option>
                            {targetZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                        </select>
                    </div>
                )}

                {selectedZone && <ChevronRight size={16} className="text-slate-600 hidden md:block" />}

                {/* MC */}
                {(targetMCs.length > 0 || selectedMC) && selectedZone && (
                     <div className="flex-1 min-w-[200px]">
                        <select
                            value={selectedMC}
                            onChange={(e) => {
                                setSelectedMC(e.target.value);
                                setSelectedBuscenta('');
                                setSelectedCell('');
                            }}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-church-blue-500/50"
                        >
                            <option value="">-- All MCs --</option>
                            {targetMCs.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                )}

                {selectedMC && <ChevronRight size={16} className="text-slate-600 hidden md:block" />}

                {/* BUSCENTA */}
                 {(targetBuscentas.length > 0 || selectedBuscenta) && selectedMC && (
                     <div className="flex-1 min-w-[200px]">
                        <select
                            value={selectedBuscenta}
                            onChange={(e) => {
                                setSelectedBuscenta(e.target.value);
                                setSelectedCell('');
                            }}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-church-blue-500/50"
                        >
                            <option value="">-- All Buscentas --</option>
                            {targetBuscentas.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                )}

                {selectedBuscenta && <ChevronRight size={16} className="text-slate-600 hidden md:block" />}

                {/* CELL */}
                {(targetCells.length > 0 || selectedCell) && selectedBuscenta && (
                     <div className="flex-1 min-w-[200px]">
                        <select
                            value={selectedCell}
                            onChange={(e) => setSelectedCell(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-church-blue-500/50"
                        >
                            <option value="">-- All Cells --</option>
                            {targetCells.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                )}

            </div>
        </div>
    );
}
