import { useEffect, useState, useMemo, useRef } from "react";
import { fetchHierarchyData } from "../services/hierarchyService";
import { buildTree } from "../utils/treeUtils";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Users, Home } from "lucide-react";

// ==========================================
// COLOR THEMES — one per MC column
// ==========================================
const MC_THEMES = [
  {
    namePlateBg: "bg-violet-900/90",
    darkTint: "bg-violet-950/50",
    lightTint: "bg-violet-950/10",
    textColor: "text-violet-400",
    accentText: "text-violet-300",
    buscentaBg: "bg-violet-950/30 border-violet-500/20 hover:border-violet-500/40",
    buscentaActiveBg: "bg-violet-900/60 border-violet-400/60 text-white",
    cellBg: "bg-violet-950/20 border-violet-500/15 hover:border-violet-500/30",
    cellActiveBg: "bg-violet-900/50 border-violet-400/55 text-white",
    shepherdBg: "bg-violet-950/45 border-violet-500/25 text-violet-200",
    memberBg: "bg-violet-950/20 border-violet-500/15 text-slate-200"
  },
  {
    namePlateBg: "bg-rose-900/90",
    darkTint: "bg-rose-950/50",
    lightTint: "bg-rose-950/10",
    textColor: "text-rose-400",
    accentText: "text-rose-300",
    buscentaBg: "bg-rose-950/30 border-rose-500/20 hover:border-rose-500/40",
    buscentaActiveBg: "bg-rose-900/60 border-rose-400/60 text-white",
    cellBg: "bg-rose-950/20 border-rose-500/15 hover:border-rose-500/30",
    cellActiveBg: "bg-rose-900/50 border-rose-400/55 text-white",
    shepherdBg: "bg-rose-950/45 border-rose-500/25 text-rose-200",
    memberBg: "bg-rose-950/20 border-rose-500/15 text-slate-200"
  },
  {
    namePlateBg: "bg-black",
    darkTint: "bg-neutral-900/60",
    lightTint: "bg-neutral-950/15",
    textColor: "text-zinc-400",
    accentText: "text-zinc-200",
    buscentaBg: "bg-zinc-900/40 border-zinc-800/30 hover:border-zinc-700/50",
    buscentaActiveBg: "bg-zinc-800/60 border-zinc-600/60 text-white",
    cellBg: "bg-zinc-900/30 border-zinc-800/20 hover:border-zinc-700/40",
    cellActiveBg: "bg-zinc-800/50 border-zinc-600/50 text-white",
    shepherdBg: "bg-zinc-950/45 border-zinc-800/25 text-zinc-300",
    memberBg: "bg-zinc-950/20 border-zinc-800/10 text-zinc-400"
  },
  {
    namePlateBg: "bg-blue-900/90",
    darkTint: "bg-blue-950/50",
    lightTint: "bg-blue-950/10",
    textColor: "text-blue-400",
    accentText: "text-blue-300",
    buscentaBg: "bg-blue-950/30 border-blue-500/20 hover:border-blue-500/40",
    buscentaActiveBg: "bg-blue-900/60 border-blue-400/60 text-white",
    cellBg: "bg-blue-950/20 border-blue-500/15 hover:border-blue-500/30",
    cellActiveBg: "bg-blue-900/50 border-blue-400/55 text-white",
    shepherdBg: "bg-blue-950/45 border-blue-500/25 text-blue-200",
    memberBg: "bg-blue-950/20 border-blue-500/15 text-slate-200"
  },
  {
    namePlateBg: "bg-amber-950/90",
    darkTint: "bg-amber-950/45",
    lightTint: "bg-amber-950/10",
    textColor: "text-amber-500",
    accentText: "text-amber-400",
    buscentaBg: "bg-amber-950/25 border-amber-900/20 hover:border-amber-900/40",
    buscentaActiveBg: "bg-amber-900/50 border-amber-500/50 text-white",
    cellBg: "bg-amber-950/15 border-amber-900/15 hover:border-amber-900/35",
    cellActiveBg: "bg-amber-900/40 border-amber-500/45 text-white",
    shepherdBg: "bg-amber-950/35 border-amber-900/20 text-amber-300",
    memberBg: "bg-amber-950/15 border-amber-900/15 text-slate-200"
  },
  {
    namePlateBg: "bg-emerald-900/90",
    darkTint: "bg-emerald-950/50",
    lightTint: "bg-emerald-950/10",
    textColor: "text-emerald-400",
    accentText: "text-emerald-300",
    buscentaBg: "bg-emerald-950/30 border-emerald-500/20 hover:border-emerald-500/40",
    buscentaActiveBg: "bg-emerald-600/30 border-emerald-400/60 text-white",
    cellBg: "bg-emerald-950/20 border-emerald-500/15 hover:border-emerald-500/30",
    cellActiveBg: "bg-emerald-600/30 border-emerald-400/60 text-white",
    shepherdBg: "bg-emerald-950/45 border-emerald-500/25 text-emerald-200",
    memberBg: "bg-emerald-950/20 border-emerald-500/15 text-slate-200"
  },
];

// ==========================================
// AVATAR
// ==========================================
function Avatar({ person, size = "md", accent = "border-white/20" }) {
  const dims =
    size === "xl" ? "w-20 h-20"
    : size === "lg" ? "w-16 h-16"
    : size === "sm" ? "w-8 h-8"
    : "w-11 h-11";
  const textSize =
    size === "xl" ? "text-2xl"
    : size === "lg" ? "text-xl"
    : size === "sm" ? "text-[10px]"
    : "text-base";
  if (!person) return null;
  const initial = (person.name || person.full_name || "?").charAt(0).toUpperCase();
  return (
    <div className={`${dims} rounded-full border-2 ${accent} overflow-hidden bg-slate-800 flex items-center justify-center shrink-0 shadow-lg`}>
      {person.photo || person.photo_url ? (
        <img src={person.photo || person.photo_url} alt={person.name} className="w-full h-full object-cover" style={{ objectPosition: "center 20%" }} />
      ) : (
        <span className={`font-black ${textSize} text-slate-300`}>{initial}</span>
      )}
    </div>
  );
}

// ==========================================
// HELPERS
// ==========================================
function countDescendantMembers(node) {
  const direct = node.members?.length || 0;
  const fromChildren = (node.children || []).reduce((sum, child) => sum + countDescendantMembers(child), 0);
  return direct + fromChildren;
}

function getRoleLabel(unitType) {
  switch (unitType) {
    case "BRANCH":   return "ALPHA BRANCH PASTOR";
    case "CHURCH":   return "CHURCH HEAD";
    case "MC":       return "MC HEAD";
    case "BUSCENTA": return "BUSCENTA HEAD";
    case "CELL":     return "CELL SHEPHERD";
    default:         return "LEADER";
  }
}

function getChildLabel(unitType) {
  switch (unitType) {
    case "BRANCH":   return "Churches";
    case "CHURCH":   return "MCs";
    case "MC":       return "Buscentas";
    case "BUSCENTA": return "Cells";
    case "CELL":     return "Members";
    default:         return "Units";
  }
}

function getPrimaryCellShepherd(unit) {
  return (unit.leaders || []).find(l => l.role?.toLowerCase() === "cell shepherd") || null;
}

function getCellPeople(unit) {
  const list = [];
  const primary = getPrimaryCellShepherd(unit);
  const primaryId = primary?.id || primary?.person_id;
  (unit.leaders || []).forEach(l => {
    const lId = l.id || l.person_id;
    if (primaryId && lId === primaryId) return;
    list.push({ ...l, isShepherd: true });
  });
  (unit.members || []).forEach(m => list.push({ ...m, isShepherd: false }));
  return list;
}

// ==========================================
// PANEL SHELL — shared wrapper for each drill-down column
// ==========================================
function Panel({ title, subtitle, style, children }) {
  return (
    <div
      className="shrink-0 flex flex-col rounded-2xl bg-slate-900/60 border border-white/5 overflow-hidden"
      style={{ width: "72vw", maxWidth: 280, minWidth: 180, scrollSnapAlign: "start", ...style }}
    >
      <div className="px-3 py-2.5 border-b border-white/5 bg-black/20 shrink-0">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{title}</p>
        {subtitle && <p className="text-[8px] text-church-blue-400 font-bold uppercase truncate mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1.5" style={{ maxHeight: "55vh" }}>
        {children}
      </div>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function MindMapDrillDown({ searchTerm = "" }) {
  const { getManagedUnits } = useAuth();
  const [tree, setTree]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const [activeZoneIndex,    setActiveZoneIndex]    = useState(0);
  const [activeMcId,         setActiveMcId]         = useState(null);
  const [selectedBuscentaId, setSelectedBuscentaId] = useState(null);
  const [selectedCellId,     setSelectedCellId]     = useState(null);

  const panelRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const [managedUnits, data] = await Promise.all([getManagedUnits(), fetchHierarchyData()]);
        let filtered = data;
        if (managedUnits !== "ALL") filtered = data.filter(u => managedUnits.has(u.id));
        setTree(buildTree(filtered));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getManagedUnits]);

  const activeZone = tree[activeZoneIndex];

  // Search filtering
  const filteredMCs = useMemo(() => {
    if (!activeZone?.children) return [];
    if (!searchTerm.trim()) return activeZone.children;
    const term = searchTerm.toLowerCase();
    return activeZone.children.map(mc => {
      const mcMatches = mc.name?.toLowerCase().includes(term) || mc.leaders?.some(l => l.name?.toLowerCase().includes(term));
      const filteredBuscentas = (mc.children || []).map(busc => {
        const busMatches = busc.name?.toLowerCase().includes(term) || busc.leaders?.some(l => l.name?.toLowerCase().includes(term));
        const filteredCells = (busc.children || []).filter(cell =>
          cell.name?.toLowerCase().includes(term) ||
          cell.leaders?.some(l => l.name?.toLowerCase().includes(term)) ||
          cell.members?.some(m => m.name?.toLowerCase().includes(term))
        );
        if (busMatches || filteredCells.length > 0) return { ...busc, children: busMatches ? busc.children : filteredCells };
        return null;
      }).filter(Boolean);
      if (mcMatches || filteredBuscentas.length > 0) return { ...mc, children: mcMatches ? mc.children : filteredBuscentas };
      return null;
    }).filter(Boolean);
  }, [activeZone, searchTerm]);

  // Auto-select first MC when zone or search changes
  useEffect(() => {
    setActiveMcId(prev => {
      if (prev && filteredMCs.some(mc => mc.id === prev)) return prev;
      return filteredMCs[0]?.id ?? null;
    });
    setSelectedBuscentaId(null);
    setSelectedCellId(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeZoneIndex, filteredMCs.length]);

  // Auto-scroll panel container to reveal newly opened panels
  useEffect(() => {
    if (panelRef.current) {
      setTimeout(() => {
        panelRef.current?.scrollTo({ left: panelRef.current.scrollWidth, behavior: "smooth" });
      }, 150);
    }
  }, [selectedBuscentaId, selectedCellId]);

  // Derived selections
  const activeMcIndex  = filteredMCs.findIndex(mc => mc.id === activeMcId);
  const activeMcTheme  = MC_THEMES[(activeMcIndex >= 0 ? activeMcIndex : 0) % MC_THEMES.length];
  const activeMc       = filteredMCs.find(mc => mc.id === activeMcId) ?? null;
  const activeBuscenta = activeMc?.children?.find(b => b.id === selectedBuscentaId) ?? null;
  const activeCell     = activeBuscenta?.children?.find(c => c.id === selectedCellId) ?? null;

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-church-blue-500" />
      <p className="text-slate-400 text-sm font-semibold animate-pulse">Loading structure…</p>
    </div>
  );

  if (error) return (
    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm font-semibold max-w-lg mx-auto text-center my-12">
      Failed to load hierarchy: {error}
    </div>
  );

  return (
    <div className="space-y-6 pb-12">

      {/* Zone Selector Tabs */}
      {tree.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2">
          {tree.map((zone, idx) => (
            <button
              key={zone.id}
              onClick={() => { setActiveZoneIndex(idx); setActiveMcId(null); setSelectedBuscentaId(null); setSelectedCellId(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                activeZoneIndex === idx
                  ? "bg-church-blue-600 text-white shadow-lg shadow-church-blue-500/20"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {zone.name}
            </button>
          ))}
        </div>
      )}

      {/* Zone / Church Head Card */}
      {activeZone && (
        <div className="flex flex-col items-center">
          {(() => {
            const zoneHead = activeZone.unit_type === "CELL"
              ? (activeZone.leaders?.find(l => l.role?.toLowerCase() === "cell shepherd") || activeZone.leaders?.[0])
              : activeZone.leaders?.[0];
            return (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-5 px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 border border-white/10 rounded-3xl shadow-2xl w-full max-w-sm hover:border-white/20 transition-all duration-300"
              >
                <Avatar person={zoneHead} size="xl" accent="border-church-blue-500/40" />
                <div className="min-w-0">
                  <h3 className="text-base font-black text-white leading-tight uppercase tracking-tight">{zoneHead?.name || "Unassigned"}</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                    {activeZone.unit_type === "CELL"
                      ? (zoneHead?.role?.toLowerCase() === "cell shepherd" ? "Cell Shepherd" : (zoneHead?.role || getRoleLabel(activeZone.unit_type)))
                      : (zoneHead?.role || getRoleLabel(activeZone.unit_type))}
                  </p>
                </div>
              </motion.div>
            );
          })()}

          {filteredMCs.length > 0 && <div className="w-0.5 h-6 bg-slate-700/60 mt-1" />}

          {/* CELL-type zone: show shepherds + members directly */}
          {activeZone.unit_type === "CELL" && (() => {
            const people    = getCellPeople(activeZone);
            const shepherds = people.filter(p => p.isShepherd);
            const members   = people.filter(p => !p.isShepherd);
            return (
              <div className="w-full max-w-sm space-y-3 mt-3">
                {people.length === 0 ? (
                  <p className="text-[9px] text-slate-600 italic text-center py-4">No shepherds or members in this cell yet</p>
                ) : (
                  <>
                    {shepherds.length > 0 && (
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-violet-400/70 mb-1.5 px-1">Shepherds</p>
                        <div className="space-y-1.5">
                          {shepherds.map((p, i) => (
                            <div key={i} className="flex items-center gap-3 bg-violet-950/10 border border-violet-500/20 rounded-2xl p-3">
                              <Avatar person={p} size="sm" accent="border-violet-500/30" />
                              <span className="text-[11px] text-violet-300 font-bold truncate">{p.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {members.length > 0 && (
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500/70 mb-1.5 px-1">Members</p>
                        <div className="space-y-1.5">
                          {members.map((m, i) => (
                            <div key={i} className="flex items-center gap-3 bg-slate-900/50 rounded-2xl p-3 border border-white/5">
                              <Avatar person={m} size="sm" accent="border-white/10" />
                              <span className="text-[11px] text-slate-300 font-bold truncate">{m.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* MC Photo Cards — now clickable selectors */}
      {activeZone?.unit_type !== "CELL" && filteredMCs.length > 0 && (
        <div className="w-full overflow-x-auto -mx-2 px-2 no-scrollbar">
          <div className="flex gap-3 w-max pb-1">
            {filteredMCs.map((mc, idx) => {
              const isActive = mc.id === activeMcId;
              const theme    = MC_THEMES[idx % MC_THEMES.length];
              const mcLeader = mc.unit_type === "CELL"
                ? mc.leaders?.find(l => l.role?.toLowerCase() === "cell shepherd") || null
                : mc.leaders?.[0];

              return (
                <button
                  key={mc.id}
                  onClick={() => { setActiveMcId(mc.id); setSelectedBuscentaId(null); setSelectedCellId(null); }}
                  className={`shrink-0 rounded-2xl overflow-hidden border-2 transition-all duration-300 shadow-xl text-left ${
                    isActive
                      ? "border-church-blue-400 scale-[1.02] shadow-church-blue-500/20"
                      : "border-white/5 hover:border-white/20 hover:scale-[1.01]"
                  }`}
                  style={{ width: 200 }}
                >
                  <div className="w-full h-36 bg-slate-950 overflow-hidden">
                    {mcLeader?.photo ? (
                      <img src={mcLeader.photo} alt={mcLeader.name} className="w-full h-full object-cover" style={{ objectPosition: "center 20%" }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-5xl font-black text-slate-700">{mcLeader?.name?.charAt(0).toUpperCase() || "?"}</span>
                      </div>
                    )}
                  </div>
                  <div className={`px-3 py-2.5 ${theme.namePlateBg}`}>
                    <span className={`inline-block mb-1 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider bg-white/5 border border-white/10 rounded ${theme.textColor}`}>
                      {mc.unit_type === "CELL" ? "CELL SHEPHERD" : (mcLeader?.role?.toUpperCase() || getRoleLabel(mc.unit_type))}
                    </span>
                    <h4 className="text-[11px] font-black text-white leading-tight uppercase tracking-tight truncate">
                      {mcLeader?.name || "No Leader Assigned"}
                    </h4>
                    <p className={`text-[8px] ${theme.textColor} font-bold uppercase tracking-wider mt-0.5 truncate`}>{mc.name}</p>
                  </div>
                  {/* Active indicator bar */}
                  <div className={`h-1 transition-colors duration-300 ${isActive ? "bg-church-blue-400" : "bg-transparent"}`} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Horizontal Drill-Down Panels */}
      {activeMc && activeZone?.unit_type !== "CELL" && (
        <div ref={panelRef} className="flex gap-3 overflow-x-auto no-scrollbar pb-2" style={{ scrollSnapType: "x proximity" }}>

          {/* Panel 1: Buscentas */}
          <Panel title={`${getChildLabel(activeMc.unit_type)} · ${activeMc.children?.length || 0}`}>
            {(activeMc.children || []).length === 0 ? (
              <p className="text-[9px] text-slate-600 italic text-center py-4">No {getChildLabel(activeMc.unit_type).toLowerCase()} yet</p>
            ) : (activeMc.children || []).map(b => {
              const isSelected  = b.id === selectedBuscentaId;
              const bLeader     = b.leaders?.[0];
              const childCount  = b.children?.length || 0;
              const memberCount = countDescendantMembers(b);
              return (
                <button
                  key={b.id}
                  onClick={() => { setSelectedBuscentaId(isSelected ? null : b.id); setSelectedCellId(null); }}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left border transition-all duration-200 ${
                    isSelected ? activeMcTheme.buscentaActiveBg : `${activeMcTheme.buscentaBg} hover:brightness-110`
                  }`}
                >
                  <Avatar person={bLeader} size="sm" accent="border-white/10" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black text-white leading-tight uppercase tracking-tight truncate">{bLeader?.name || "No Leader"}</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 truncate">{b.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[8px] text-slate-400 flex items-center gap-1 font-bold">
                        <Home size={8} className="shrink-0" />
                        <span className="font-black text-white">{childCount}</span> {getChildLabel(b.unit_type)}
                      </span>
                      <span className="text-[8px] text-slate-400 flex items-center gap-1 font-bold">
                        <Users size={8} className="shrink-0" />
                        <span className="font-black text-white">{memberCount}</span> Members
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={11} className={`shrink-0 transition-colors duration-200 ${isSelected ? "text-church-blue-400" : "text-slate-700"}`} />
                </button>
              );
            })}
          </Panel>

          {/* Panel 2: Cells of selected Buscenta */}
          <AnimatePresence>
            {activeBuscenta && (
              <motion.div
                key={`cells-${selectedBuscentaId}`}
                initial={{ opacity: 0, x: 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="shrink-0 flex flex-col rounded-2xl bg-slate-900/60 border border-white/5 overflow-hidden"
                style={{ width: "72vw", maxWidth: 280, minWidth: 180, scrollSnapAlign: "start" }}
              >
                <div className="px-3 py-2.5 border-b border-white/5 bg-black/20 shrink-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Cells · {activeBuscenta.children?.length || 0}</p>
                  <p className="text-[8px] text-church-blue-400 font-bold uppercase truncate mt-0.5">{activeBuscenta.name}</p>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1.5" style={{ maxHeight: "55vh" }}>
                  {(activeBuscenta.children || []).length === 0 ? (
                    <p className="text-[9px] text-slate-600 italic text-center py-4">No cells yet</p>
                  ) : (activeBuscenta.children || []).map(c => {
                    const isSelected  = c.id === selectedCellId;
                    const shepherd    = getPrimaryCellShepherd(c);
                    const memberCount = (c.members?.length || 0) + (c.leaders?.filter(l => l.role?.toLowerCase() !== "cell shepherd").length || 0);
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCellId(isSelected ? null : c.id)}
                        className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left border transition-all duration-200 ${
                          isSelected ? activeMcTheme.cellActiveBg : `${activeMcTheme.cellBg} hover:brightness-110`
                        }`}
                      >
                        <Avatar person={shepherd} size="sm" accent="border-white/10" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black text-white leading-tight uppercase tracking-tight truncate">{c.name}</p>
                          <p className="text-[8px] text-slate-500 font-bold truncate mt-0.5">{shepherd?.name || "No Shepherd"}</p>
                          <span className="text-[8px] text-slate-400 flex items-center gap-1 font-bold mt-1">
                            <Users size={8} className="shrink-0" />
                            <span className="font-black text-white">{memberCount}</span> Members
                          </span>
                        </div>
                        <ChevronRight size={11} className={`shrink-0 transition-colors duration-200 ${isSelected ? "text-church-blue-400" : "text-slate-700"}`} />
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Panel 3: People of selected Cell */}
          <AnimatePresence>
            {activeCell && (
              <motion.div
                key={`members-${selectedCellId}`}
                initial={{ opacity: 0, x: 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="shrink-0 flex flex-col rounded-2xl bg-slate-900/60 border border-white/5 overflow-hidden"
                style={{ width: "72vw", maxWidth: 280, minWidth: 180, scrollSnapAlign: "start" }}
              >
                <div className="px-3 py-2.5 border-b border-white/5 bg-black/20 shrink-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">People · {getCellPeople(activeCell).length}</p>
                  <p className="text-[8px] text-church-blue-400 font-bold uppercase truncate mt-0.5">{activeCell.name}</p>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1.5" style={{ maxHeight: "55vh" }}>
                  {getCellPeople(activeCell).length === 0 ? (
                    <p className="text-[9px] text-slate-600 italic text-center py-4">No members yet</p>
                  ) : getCellPeople(activeCell).map((p, i) => (
                    <div key={i} className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${p.isShepherd ? activeMcTheme.shepherdBg : activeMcTheme.memberBg}`}>
                      <Avatar person={p} size="sm" accent="border-white/10" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-white leading-tight truncate">{p.name}</p>
                        <p className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${p.isShepherd ? "text-violet-400" : "text-slate-500"}`}>
                          {p.isShepherd ? "Shepherd" : "Member"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}

      {/* Empty search state */}
      {searchTerm && filteredMCs.length === 0 && (
        <div className="text-center py-16 opacity-50">
          <p className="text-slate-400 text-sm font-semibold">
            No results for "<span className="text-white">{searchTerm}</span>"
          </p>
        </div>
      )}
    </div>
  );
}
