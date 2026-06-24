import { useEffect, useState, useMemo, useCallback } from "react";
import { fetchHierarchyData } from "../services/hierarchyService";
import { buildTree } from "../utils/treeUtils";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Users, Home } from "lucide-react";

// ==========================================
// COLOR THEMES — one per MC column
// Defined with split-shading properties (darkTint, lightTint) and deepest namePlateBg.
// ==========================================
const MC_THEMES = [
  {
    // 1 — Violet (Agape MC)
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
    // 2 — Rose (Dunamis MC)
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
    // 3 — Black (Media SM)
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
    // 4 — Blue (New Testament MC - changed from Teal)
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
    // 5 — Amber/Brown (Soul Winners' MC)
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
    // 6 — Emerald (Fallback)
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
// AVATAR — full-face photo or initial
// Fix 3: object-[center_20%] focuses on face area rather than top
// ==========================================
function Avatar({ person, size = "md", accent = "border-white/20" }) {
  const dims =
    size === "xl"
      ? "w-20 h-20"
      : size === "lg"
      ? "w-16 h-16"
      : size === "sm"
      ? "w-8 h-8"
      : "w-11 h-11";
  const textSize =
    size === "xl"
      ? "text-2xl"
      : size === "lg"
      ? "text-xl"
      : size === "sm"
      ? "text-[10px]"
      : "text-base";
  if (!person) return null;
  const initial = (person.name || person.full_name || "?")
    .charAt(0)
    .toUpperCase();
  return (
    <div
      className={`${dims} rounded-full border-2 ${accent} overflow-hidden bg-slate-800 flex items-center justify-center shrink-0 shadow-lg`}
    >
      {person.photo || person.photo_url ? (
        <img
          src={person.photo || person.photo_url}
          alt={person.name}
          className="w-full h-full object-cover"
          style={{ objectPosition: "center 20%" }}
        />
      ) : (
        <span className={`font-black ${textSize} text-slate-300`}>
          {initial}
        </span>
      )}
    </div>
  );
}

// ==========================================
// HELPERS
// ==========================================

/** Recursively sum all members across a node and its descendants */
function countDescendantMembers(node) {
  const direct = node.members?.length || 0;
  const fromChildren = (node.children || []).reduce(
    (sum, child) => sum + countDescendantMembers(child),
    0
  );
  return direct + fromChildren;
}

/**
 * Returns the correct role label for a given unit_type.
 * Used on the MC-card badge so it always shows the right title
 * regardless of which hierarchy level is currently the "root".
 */
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

/**
 * Returns the correct label for the children of a given unit_type.
 * e.g. MC → "Buscentas", BUSCENTA → "Cells", CELL → "Members"
 */
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

/**
 * Returns the designated Cell Shepherd for a CELL unit.
 * ONLY matches role === 'cell shepherd' from the DB — no fallback.
 * Returns null if the cell has no designated Cell Shepherd.
 */
function getPrimaryCellShepherd(unit) {
  const leaders = unit.leaders || [];
  return leaders.find(l => l.role?.toLowerCase() === 'cell shepherd') || null;
}

/**
 * Returns all NON-primary leaders and members for a CELL unit,
 * tagged with isShepherd so the UI can colour them correctly.
 * The primary cell shepherd is EXCLUDED (shown on the card instead).
 */
function getCellPeople(unit) {
  const list = [];
  const leaders = unit.leaders || [];
  const primary = getPrimaryCellShepherd(unit);
  const primaryId = primary?.id || primary?.person_id;

  // All leaders other than the primary → assistant shepherds
  leaders.forEach(l => {
    const lId = l.id || l.person_id;
    if (primaryId && lId === primaryId) return; // skip primary (shown on card)
    list.push({
      ...l,
      isShepherd: true,
      displayRole: 'Shepherd'
    });
  });

  const members = unit.members || [];
  members.forEach(m => {
    list.push({
      ...m,
      isShepherd: false,
      displayRole: 'Member'
    });
  });

  return list;
}

// ==========================================
// DRILLDOWN NODE COMPONENT (RECURSIVE)
// ==========================================
function DrillDownNode({ unit, theme }) {
  const [isOpen, setIsOpen] = useState(false);

  const isCell = unit.unit_type === "CELL";
  const leader = isCell
    ? (unit.leaders?.find(l => l.role?.toLowerCase() === 'cell shepherd') || null)
    : unit.leaders?.[0];
    
  const subUnitCount = isCell ? 0 : (unit.children?.length || 0);
  const totalMembers = isCell
    ? (unit.members?.length || 0)
    : countDescendantMembers(unit);

  const handleToggle = () => {
    setIsOpen(prev => !prev);
  };

  // Determine styles based on depth/type
  const bgClass = isCell
    ? (isOpen ? theme.cellActiveBg : `${theme.cellBg} hover:brightness-110`)
    : (isOpen ? theme.buscentaActiveBg : `${theme.buscentaBg} hover:brightness-110`);
    
  const paddingClass = isCell ? "p-2.5 rounded-xl text-xs" : "p-3 rounded-2xl text-sm";
  const titleSize = isCell ? "text-[9px]" : "text-[10px]";

  return (
    <div className="space-y-1.5 w-full">
      <button
        onClick={handleToggle}
        className={`w-full flex items-center gap-2.5 ${paddingClass} text-left border transition-all duration-200 shadow-sm ${bgClass}`}
      >
        <Avatar
          person={leader}
          size="sm"
          accent="border-white/10"
        />
        <div className="min-w-0 flex-1">
          <h5 className={`${titleSize} font-black text-white leading-tight uppercase tracking-tight truncate`}>
            {isCell ? unit.name : (leader?.name || "No Leader")}
          </h5>
          <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 truncate">
            {isCell ? (leader?.name || "No Shepherd Assigned") : unit.name}
          </p>
          <div className="flex items-center gap-3 mt-1">
            {!isCell && (
              <span className="text-[8px] text-slate-400 flex items-center gap-1 font-bold">
                <Home size={9} className="shrink-0" />
                <span className="font-black text-white">{subUnitCount}</span>{" "}
                {getChildLabel(unit.unit_type)}
              </span>
            )}
            <span className="text-[8px] text-slate-400 flex items-center gap-1 font-bold">
              <Users size={9} className="shrink-0" />
              <span className="font-black text-white">{totalMembers}</span>{" "}
              Members
            </span>
          </div>
        </div>
        <ChevronRight
          size={12}
          className={`text-slate-600 transition-transform duration-300 shrink-0 ${
            isOpen ? "rotate-90 text-church-blue-400" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-l border-slate-800/80 ml-1.5 pl-1.5 space-y-1.5 py-1 w-full"
          >
            {isCell ? (
              (() => {
                const cellPeople = getCellPeople(unit);
                const shepherds = cellPeople.filter(p => p.isShepherd);
                const members = cellPeople.filter(p => !p.isShepherd);
                return cellPeople.length === 0 ? (
                  <p className="text-[8px] text-slate-600 italic pl-1">
                    No members in this cell
                  </p>
                ) : (
                  <div className="space-y-2 py-1 px-1">
                    {shepherds.length > 0 && (
                      <div>
                        <p className="text-[7px] font-black uppercase tracking-widest text-violet-400/70 mb-1.5 px-0.5">
                          Shepherds
                        </p>
                        <div className="grid grid-cols-1 gap-1.5">
                          {shepherds.map((p, i) => (
                            <div key={i} className={`flex items-center gap-2 border rounded-lg px-2 py-1.5 ${theme.shepherdBg}`}>
                              <Avatar person={p} size="sm" accent="border-white/10" />
                              <span className="text-[10px] font-bold truncate">{p.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {members.length > 0 && (
                      <div>
                        <p className="text-[7px] font-black uppercase tracking-widest text-slate-500/70 mb-1.5 px-0.5">
                          Members
                        </p>
                        <div className="grid grid-cols-1 gap-1.5">
                          {members.map((p, i) => (
                            <div key={i} className={`flex items-center gap-2 border rounded-lg px-2 py-1.5 ${theme.memberBg}`}>
                              <Avatar person={p} size="sm" accent="border-white/10" />
                              <span className="text-[10px] font-bold truncate">{p.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              (unit.children || []).length === 0 ? (
                <p className="text-[8px] text-slate-600 italic pl-1">
                  No {getChildLabel(unit.unit_type).toLowerCase()} yet
                </p>
              ) : (
                (unit.children || []).map(child => (
                  <DrillDownNode
                    key={child.id}
                    unit={child}
                    theme={theme}
                  />
                ))
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function MindMapDrillDown({ searchTerm = "" }) {
  const { getManagedUnits } = useAuth();
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeZoneIndex, setActiveZoneIndex] = useState(0);
  const [selectedBuscentaId, setSelectedBuscentaId] = useState(null);
  const [selectedCellId, setSelectedCellId] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [managedUnits, data] = await Promise.all([
          getManagedUnits(),
          fetchHierarchyData(),
        ]);
        let filtered = data;
        if (managedUnits !== "ALL") {
          filtered = data.filter((u) => managedUnits.has(u.id));
        }
        const built = buildTree(filtered);
        setTree(built);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getManagedUnits]);

  const handleBuscentaSelect = useCallback((id) => {
    setSelectedBuscentaId((prev) => (prev === id ? null : id));
    setSelectedCellId(null);
  }, []);

  const handleCellSelect = useCallback((id) => {
    setSelectedCellId((prev) => (prev === id ? null : id));
  }, []);

  const activeZone = tree[activeZoneIndex];

  // Search filtering
  const filteredMCs = useMemo(() => {
    if (!activeZone?.children) return [];
    if (!searchTerm.trim()) return activeZone.children;
    const term = searchTerm.toLowerCase();
    return activeZone.children
      .map((mc) => {
        const mcMatches =
          mc.name?.toLowerCase().includes(term) ||
          mc.leaders?.some((l) => l.name?.toLowerCase().includes(term));
        const filteredBuscentas = (mc.children || [])
          .map((busc) => {
            const busMatches =
              busc.name?.toLowerCase().includes(term) ||
              busc.leaders?.some((l) => l.name?.toLowerCase().includes(term));
            const filteredCells = (busc.children || []).filter(
              (cell) =>
                cell.name?.toLowerCase().includes(term) ||
                cell.leaders?.some((l) =>
                  l.name?.toLowerCase().includes(term)
                ) ||
                cell.members?.some((m) => m.name?.toLowerCase().includes(term))
            );
            if (busMatches || filteredCells.length > 0) {
              return {
                ...busc,
                children: busMatches ? busc.children : filteredCells,
              };
            }
            return null;
          })
          .filter(Boolean);
        if (mcMatches || filteredBuscentas.length > 0) {
          return {
            ...mc,
            children: mcMatches ? mc.children : filteredBuscentas,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [activeZone, searchTerm]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-church-blue-500" />
        <p className="text-slate-400 text-sm font-semibold animate-pulse">
          Loading structure…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm font-semibold max-w-lg mx-auto text-center my-12">
        Failed to load hierarchy: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Zone Selector Tabs */}
      {tree.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2">
          {tree.map((zone, idx) => (
            <button
              key={zone.id}
              onClick={() => {
                setActiveZoneIndex(idx);
                setSelectedBuscentaId(null);
                setSelectedCellId(null);
              }}
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

      {/* ── Hierarchy Tree Container (Church + MCs) ── 
          Wrapped in a flex-col to eliminate the space-y-6 gap from parent */}
      <div className="flex flex-col w-full">
        {/* ── Church / Church Head card ── */}
        {activeZone && (
        <div className="flex flex-col items-center">
          {(() => {
            // For CELL zones: show the actual Cell Shepherd on the card
            const zoneHead = activeZone.unit_type === 'CELL'
              ? (activeZone.leaders?.find(l => l.role?.toLowerCase() === 'cell shepherd') || activeZone.leaders?.[0])
              : activeZone.leaders?.[0];
            return (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-5 px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 border border-white/10 rounded-3xl shadow-2xl w-full max-w-sm hover:border-white/20 transition-all duration-300"
              >
                <Avatar
                  person={zoneHead}
                  size="xl"
                  accent="border-church-blue-500/40"
                />
                <div className="min-w-0">
                  <h3 className="text-base font-black text-white leading-tight uppercase tracking-tight">
                    {zoneHead?.name || "Unassigned"}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                    {activeZone.unit_type === 'CELL'
                      ? (zoneHead?.role?.toLowerCase() === 'cell shepherd' ? 'Cell Shepherd' : (zoneHead?.role || getRoleLabel(activeZone.unit_type)))
                      : (zoneHead?.role || getRoleLabel(activeZone.unit_type))}
                  </p>
                </div>
              </motion.div>
            );
          })()}

          {filteredMCs.length > 0 && (
            <div className="w-0.5 h-6 bg-slate-700/60 mt-1" />
          )}

          {/* ── CELL-level zone: show shepherds THEN members below the head card ── */}
          {activeZone.unit_type === "CELL" && (() => {
            const cellPeople = getCellPeople(activeZone);
            const shepherds = cellPeople.filter(p => p.isShepherd);
            const members = cellPeople.filter(p => !p.isShepherd);
            const totalCount = shepherds.length + members.length;

            return (
              <div className="w-full max-w-sm space-y-3 mt-3">
                {totalCount === 0 ? (
                  <p className="text-[9px] text-slate-600 italic text-center py-4">
                    No shepherds or members in this cell yet
                  </p>
                ) : (
                  <>
                    {/* Shepherds first — violet */}
                    {shepherds.length > 0 && (
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-violet-400/70 mb-1.5 px-1">
                          Shepherds
                        </p>
                        <div className="space-y-1.5">
                          {shepherds.map((p, i) => (
                            <div
                              key={`shep-${i}`}
                              className="flex items-center gap-3 bg-violet-950/10 border border-violet-500/20 rounded-2xl p-3"
                            >
                              <Avatar person={p} size="sm" accent="border-violet-500/30" />
                              <span className="text-[11px] text-violet-300 font-bold truncate">
                                {p.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Members after */}
                    {members.length > 0 && (
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500/70 mb-1.5 px-1">
                          Members
                        </p>
                        <div className="space-y-1.5">
                          {members.map((m, i) => (
                            <div
                              key={`mem-${i}`}
                              className="flex items-center gap-3 bg-slate-900/50 rounded-2xl p-3 border border-white/5"
                            >
                              <Avatar person={m} size="sm" accent="border-white/10" />
                              <span className="text-[11px] text-slate-300 font-bold truncate">
                                {m.name}
                              </span>
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


      {/* ── MC Columns ──
          Fix 1: RESTORED horizontal scroll. On landscape the phone shows more
          columns; snap scrolling keeps the UX smooth. ── */}
      {filteredMCs.length > 0 && (
        <div
          className="w-full overflow-x-auto -mx-2 px-2 no-scrollbar"
        >
          <div
            className="flex gap-0 w-max mx-auto"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {filteredMCs.map((mc, idx) => {
              const theme = MC_THEMES[idx % MC_THEMES.length];
              // For CELL: only use the actual Cell Shepherd (exact role match) — no fallback to leaders[0]
              const mcLeader = mc.unit_type === 'CELL'
                ? mc.leaders?.find(l => l.role?.toLowerCase() === 'cell shepherd') || null
                : mc.leaders?.[0];

              // For CELL: count total people (all leaders + all members)
              const buscentaCount =
                mc.unit_type === "CELL"
                  ? (mc.members?.length || 0) + (mc.leaders?.length || 0)
                  : (mc.children?.length || 0);

              // Determine roundness for the column lanes to form a unified block
              const isFirst = idx === 0;
              const isLast = idx === filteredMCs.length - 1;
              const roundedClass = isFirst && isLast 
                ? "rounded-3xl" 
                : isFirst 
                ? "rounded-l-3xl" 
                : isLast 
                ? "rounded-r-3xl" 
                : "";

              return (
                <div
                  key={mc.id}
                  className="flex flex-col items-center shrink-0"
                  style={{ width: 220, scrollSnapAlign: "center" }}
                >
                  {/* Connector: horizontal bar across all columns + vertical drop into each */}
                  <div className="w-full flex flex-col items-center">
                    {/* Horizontal bar — uses extensions to span half or full gap */}
                    <div className="w-full h-0.5 relative">
                      {/* Left extension for non-first columns */}
                      {idx > 0 && (
                        <div className="absolute right-1/2 top-0 h-0.5 bg-slate-700/60" style={{ width: '50%' }} />
                      )}
                      {/* Right extension for non-last columns */}
                      {idx < filteredMCs.length - 1 && (
                        <div className="absolute left-1/2 top-0 h-0.5 bg-slate-700/60" style={{ width: '50%' }} />
                      )}
                    </div>
                    {/* Vertical drop line from horizontal bar into MC card */}
                    <div className="w-0.5 h-5 bg-slate-700/60" />
                  </div>

                  {/* ── MC Photo Card ── */}
                  <div className="w-full px-1.5 shrink-0 relative z-10">
                    <div className="w-full rounded-2xl overflow-hidden border border-white/5 shadow-xl bg-slate-950/80 hover:scale-[1.01] transition-all duration-300">
                      {/* Photo */}
                      <div className="w-full h-40 bg-slate-950 overflow-hidden">
                        {mcLeader?.photo ? (
                          <img
                            src={mcLeader.photo}
                            alt={mcLeader.name}
                            className="w-full h-full object-cover"
                            style={{ objectPosition: "center 20%" }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-6xl font-black text-slate-700">
                              {mcLeader?.name?.charAt(0).toUpperCase() || "?"}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Name plate: Deepest Color */}
                      <div className={`px-3 py-2.5 ${theme.namePlateBg}`}>
                        <span className={`inline-block mb-1 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider bg-white/5 border border-white/10 rounded ${theme.textColor}`}>
                          {mc.unit_type === 'CELL' ? 'CELL SHEPHERD' : (mcLeader?.role?.toUpperCase() || getRoleLabel(mc.unit_type))}
                        </span>
                        <h4 className="text-[11px] font-black text-white leading-tight uppercase tracking-tight truncate">
                          {mcLeader?.name || "No Leader Assigned"}
                        </h4>
                        <p className={`text-[8px] ${theme.textColor} font-bold uppercase tracking-wider mt-0.5 truncate`}>
                          {mc.name}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── Column Lane Container ── */}
                  <div
                    className={`w-full flex flex-col pb-6 min-h-[380px] relative overflow-hidden ${roundedClass} border-r border-slate-800/40 last:border-r-0 z-0`}
                    style={{ marginTop: '-165px' }}
                  >
                    {/* Background divided into 2 shades */}
                    <div className="absolute inset-0 flex flex-col pointer-events-none -z-10">
                      {/* Top part: Darker shade where the MC head details/card is (bottom half of photo + nameplate = 165px) */}
                      <div className={`w-full h-[165px] ${theme.darkTint}`} />
                      {/* Bottom part: Lighter shade where the buscenta and cell details are */}
                      <div className={`w-full flex-1 ${theme.lightTint}`} />
                    </div>

                    {/* Spacer to push content area down below the overlapping photo card bottom and nameplate */}
                    <div className="w-full shrink-0 pointer-events-none" style={{ height: 165 }} />

                    {/* ── Content Area ── */}
                    <div className="w-full flex flex-col px-2.5 gap-3 mt-1">
                      {/* Column header — only shown for non-CELL units to avoid duplicate labels */}
                      {mc.unit_type !== 'CELL' && (
                        <div className="flex items-center justify-between px-1 mb-0.5">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                            {getChildLabel(mc.unit_type)}
                          </span>
                          <span className="text-[8px] font-black text-slate-500 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-full">
                            {buscentaCount}
                          </span>
                        </div>
                      )}

                      {buscentaCount === 0 && (
                        <p className="text-[9px] text-slate-600 italic text-center py-4">
                          {mc.unit_type === 'CELL'
                            ? 'No shepherds or members in this cell yet'
                            : `No ${getChildLabel(mc.unit_type).toLowerCase()} yet`}
                        </p>
                      )}

                      {/* ── CELL-type mc: show shepherds and members directly ── */}
                      {mc.unit_type === "CELL" && (() => {
                        const people = getCellPeople(mc);
                        const shepherds = people.filter(p => p.isShepherd);
                        const members = people.filter(p => !p.isShepherd);
                        return (
                          <div className="space-y-3 px-1">
                            {shepherds.length > 0 && (
                              <div>
                                <p className="text-[7px] font-black uppercase tracking-widest text-violet-400/70 mb-1.5 px-0.5">
                                  Shepherds
                                </p>
                                <div className="grid grid-cols-1 gap-1.5">
                                  {shepherds.map((p, i) => (
                                    <div
                                      key={i}
                                      className={`flex items-center gap-2 border rounded-xl p-2 ${theme.shepherdBg}`}
                                    >
                                      <Avatar
                                        person={p}
                                        size="sm"
                                        accent="border-white/10"
                                      />
                                      <span className="text-[10px] font-bold truncate">
                                        {p.name}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {members.length > 0 && (
                              <div>
                                <p className="text-[7px] font-black uppercase tracking-widest text-slate-500/70 mb-1.5 px-0.5">
                                  Members
                                </p>
                                <div className="grid grid-cols-1 gap-1.5">
                                  {members.map((p, i) => (
                                    <div
                                      key={i}
                                      className={`flex items-center gap-2 border rounded-xl p-2 ${theme.memberBg}`}
                                    >
                                      <Avatar
                                        person={p}
                                        size="sm"
                                        accent="border-white/10"
                                      />
                                      <span className="text-[10px] font-bold truncate">
                                        {p.name}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* ── Non-CELL mc: recursively render children ── */}
                      {mc.unit_type !== "CELL" &&
                        (mc.children || []).map((child) => (
                          <DrillDownNode
                            key={child.id}
                            unit={child}
                            theme={theme}
                          />
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Close flex-col wrapper */}
      </div>

      {/* Empty search state */}
      {searchTerm && filteredMCs.length === 0 && (
        <div className="text-center py-16 opacity-50">
          <p className="text-slate-400 text-sm font-semibold">
            No results for "
            <span className="text-white">{searchTerm}</span>"
          </p>
        </div>
      )}
    </div>
  );
}
