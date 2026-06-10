import { useEffect, useState, useMemo, useCallback } from "react";
import { fetchHierarchyData } from "../services/hierarchyService";
import { buildTree } from "../utils/treeUtils";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Users, Home } from "lucide-react";

// ==========================================
// COLOR THEMES — one per MC column
// Fix 4: replaced purple (#3) with green so all distinct from Soul Winners
// ==========================================
const MC_THEMES = [
  {
    // 1 — Violet
    columnTint: "bg-violet-500/15",
    cardBg: "bg-violet-950/90 border-violet-700/50",
    namePlateBg: "bg-violet-950 border-t border-violet-800/60",
    textColor: "text-violet-400",
    accentText: "text-violet-300",
    buscentaBg: "bg-violet-900/25 border-violet-700/30",
    buscentaActiveBg: "bg-violet-800/50 border-violet-500/50 text-violet-100",
    cellBg: "bg-violet-900/15 border-violet-800/20",
    cellActiveBg: "bg-violet-800/40 border-violet-500/50 text-violet-100",
    shepherdBg: "bg-violet-900/20 border-violet-700/30 text-violet-300",
    memberBg: "bg-violet-900/10 border-violet-800/20 text-violet-400"
  },
  {
    // 2 — Rose/Pink
    columnTint: "bg-rose-500/15",
    cardBg: "bg-rose-950/90 border-rose-700/50",
    namePlateBg: "bg-rose-950 border-t border-rose-800/60",
    textColor: "text-rose-400",
    accentText: "text-rose-300",
    buscentaBg: "bg-rose-900/25 border-rose-700/30",
    buscentaActiveBg: "bg-rose-800/50 border-rose-500/50 text-rose-100",
    cellBg: "bg-rose-900/15 border-rose-800/20",
    cellActiveBg: "bg-rose-800/40 border-rose-500/50 text-rose-100",
    shepherdBg: "bg-rose-900/20 border-rose-700/30 text-rose-300",
    memberBg: "bg-rose-900/10 border-rose-800/20 text-rose-400"
  },
  {
    // 3 — Sky/Blue
    columnTint: "bg-sky-500/15",
    cardBg: "bg-sky-950/90 border-sky-700/50",
    namePlateBg: "bg-sky-950 border-t border-sky-800/60",
    textColor: "text-sky-400",
    accentText: "text-sky-300",
    buscentaBg: "bg-sky-900/25 border-sky-700/30",
    buscentaActiveBg: "bg-sky-800/50 border-sky-500/50 text-sky-100",
    cellBg: "bg-sky-900/15 border-sky-800/20",
    cellActiveBg: "bg-sky-800/40 border-sky-500/50 text-sky-100",
    shepherdBg: "bg-sky-900/20 border-sky-700/30 text-sky-300",
    memberBg: "bg-sky-900/10 border-sky-800/20 text-sky-400"
  },
  {
    // 4 — Teal/Green
    columnTint: "bg-teal-500/15",
    cardBg: "bg-teal-950/90 border-teal-700/50",
    namePlateBg: "bg-teal-950 border-t border-teal-800/60",
    textColor: "text-teal-400",
    accentText: "text-teal-300",
    buscentaBg: "bg-teal-900/25 border-teal-700/30",
    buscentaActiveBg: "bg-teal-800/50 border-teal-500/50 text-teal-100",
    cellBg: "bg-teal-900/15 border-teal-800/20",
    cellActiveBg: "bg-teal-800/40 border-teal-500/50 text-teal-100",
    shepherdBg: "bg-teal-900/20 border-teal-700/30 text-teal-300",
    memberBg: "bg-teal-900/10 border-teal-800/20 text-teal-400"
  },
  {
    // 5 — Amber/Orange
    columnTint: "bg-amber-500/15",
    cardBg: "bg-amber-950/90 border-amber-700/50",
    namePlateBg: "bg-amber-950 border-t border-amber-800/60",
    textColor: "text-amber-400",
    accentText: "text-amber-300",
    buscentaBg: "bg-amber-900/25 border-amber-700/30",
    buscentaActiveBg: "bg-amber-800/50 border-amber-500/50 text-amber-100",
    cellBg: "bg-amber-900/15 border-amber-800/20",
    cellActiveBg: "bg-amber-800/40 border-amber-500/50 text-amber-100",
    shepherdBg: "bg-amber-900/20 border-amber-700/30 text-amber-300",
    memberBg: "bg-amber-900/10 border-amber-800/20 text-amber-400"
  },
  {
    // 6 — Emerald
    columnTint: "bg-emerald-500/15",
    cardBg: "bg-emerald-950/90 border-emerald-700/50",
    namePlateBg: "bg-emerald-950 border-t border-emerald-800/60",
    textColor: "text-emerald-400",
    accentText: "text-emerald-300",
    buscentaBg: "bg-emerald-900/25 border-emerald-700/30",
    buscentaActiveBg: "bg-emerald-800/50 border-emerald-500/50 text-emerald-100",
    cellBg: "bg-emerald-900/15 border-emerald-800/20",
    cellActiveBg: "bg-emerald-800/40 border-emerald-500/50 text-emerald-100",
    shepherdBg: "bg-emerald-900/20 border-emerald-700/30 text-emerald-300",
    memberBg: "bg-emerald-900/10 border-emerald-800/20 text-emerald-400"
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
    case "ZONE":     return "ZONAL HEAD";
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
    case "ZONE":     return "MCs";
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

      {/* ── Hierarchy Tree Container (Zone + MCs) ── 
          Wrapped in a flex-col to eliminate the space-y-6 gap from parent */}
      <div className="flex flex-col w-full">
        {/* ── Zone / Zonal Head card ── */}
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

                  {/* ── Lane Container ──
                      px-3 padding makes the card inside float centered and slightly
                      narrower than the lane, so the colored lane is visible on both sides */}
                  <div className={`w-full flex flex-col items-center pt-4 pb-6 min-h-[350px] ${theme.columnTint} ${roundedClass} px-3 gap-4 overflow-hidden`}>
                    {/* MC Card — sits inside the lane, slightly narrower */}
                    <div className={`w-full rounded-2xl overflow-hidden border shadow-xl ${theme.cardBg} hover:scale-[1.01] transition-all duration-300 shrink-0`}>
                      {/* Photo */}
                      <div className="w-full h-48 bg-black/30 overflow-hidden">
                        {mcLeader?.photo ? (
                          <img
                            src={mcLeader.photo}
                            alt={mcLeader.name}
                            className="w-full h-full object-cover"
                            style={{ objectPosition: "center 20%" }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-6xl font-black text-white/20">
                              {mcLeader?.name?.charAt(0).toUpperCase() || "?"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Name plate */}
                      <div className={`px-4 py-3.5 ${theme.namePlateBg}`}>
                        <span className={`inline-block mb-1.5 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-white/5 border border-white/10 rounded ${theme.textColor}`}>
                          {mc.unit_type === 'CELL' ? 'CELL SHEPHERD' : (mcLeader?.role?.toUpperCase() || getRoleLabel(mc.unit_type))}
                        </span>
                        <h4 className="text-xs font-black text-white leading-tight uppercase tracking-tight truncate">
                          {mcLeader?.name || "No Leader Assigned"}
                        </h4>
                        <p
                          className={`text-[9px] ${theme.textColor} font-bold uppercase tracking-wider mt-0.5 truncate`}
                        >
                          {mc.name}
                        </p>
                      </div>
                    </div>

                    {/* ── Content Column (adapts label based on unit_type) ── */}
                    <div className="w-full flex flex-col gap-3">
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

                      {/* ── Non-CELL mc: show child unit rows (buscentas or cells) ── */}
                      {mc.unit_type !== "CELL" &&
                        (mc.children || []).map((buscenta) => {
                          const isBuscentaSelected =
                            selectedBuscentaId === buscenta.id;
                          const isCell = buscenta.unit_type === "CELL";
                          const buscentaLeader = isCell
                            ? getPrimaryCellShepherd(buscenta)
                            : buscenta.leaders?.[0];
                          const subUnitCount = isCell
                            ? 0
                            : (buscenta.children?.length || 0);
                          const totalMembers = isCell
                            ? (buscenta.members?.length || 0)
                            : countDescendantMembers(buscenta);

                          return (
                            <div key={buscenta.id} className="space-y-2">
                              {/* Sub-unit row (buscenta or cell) */}
                              <button
                                onClick={() => handleBuscentaSelect(buscenta.id)}
                                className={`w-full flex items-center gap-2.5 p-3 rounded-2xl text-left border transition-all duration-200 shadow-sm ${
                                  isBuscentaSelected
                                    ? theme.buscentaActiveBg
                                    : `${theme.buscentaBg} hover:brightness-110`
                                }`}
                              >
                                <Avatar
                                  person={buscentaLeader}
                                  size="sm"
                                  accent="border-white/10"
                                />
                                <div className="min-w-0 flex-1">
                                  <h5 className="text-[10px] font-black text-white leading-tight uppercase tracking-tight truncate">
                                    {buscentaLeader?.name || "No Leader"}
                                  </h5>
                                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 truncate">
                                    {buscenta.name}
                                  </p>
                                  <div className="flex items-center gap-3 mt-1.5">
                                    {!isCell && (
                                      <span className="text-[8px] text-slate-400 flex items-center gap-1 font-bold">
                                        <Home size={9} />
                                        <span className="font-black text-white">
                                          {subUnitCount}
                                        </span>{" "}
                                        {getChildLabel(buscenta.unit_type)}
                                      </span>
                                    )}
                                    <span className="text-[8px] text-slate-400 flex items-center gap-1 font-bold">
                                      <Users size={9} />
                                      <span className="font-black text-white">
                                        {totalMembers}
                                      </span>{" "}
                                      Members
                                    </span>
                                  </div>
                                </div>
                                <ChevronRight
                                  size={12}
                                  className={`text-slate-600 transition-transform duration-300 shrink-0 ${
                                    isBuscentaSelected
                                      ? "rotate-90 text-church-blue-400"
                                      : ""
                                  }`}
                                />
                              </button>

                              {/* ── Expanded Content ── */}
                              <AnimatePresence>
                                {isBuscentaSelected && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden border-l border-slate-800/80 ml-1.5 pl-1.5 space-y-1.5 py-1"
                                  >
                                    {isCell ? (
                                      (() => {
                                        const cellPeople = getCellPeople(buscenta);
                                        const cellShepherdCount = cellPeople.filter(p => p.isShepherd).length;
                                        const cellMemberCount = cellPeople.filter(p => !p.isShepherd).length;
                                        return cellPeople.length === 0 ? (
                                          <p className="text-[8px] text-slate-600 italic pl-1">
                                            No members in this cell
                                          </p>
                                        ) : (
                                          <div className="overflow-hidden space-y-2 py-1 px-1">
                                            {/* Shepherds section */}
                                            {cellShepherdCount > 0 && (
                                              <div>
                                                <p className="text-[7px] font-black uppercase tracking-widest text-violet-400/70 mb-1.5 px-0.5">
                                                  Shepherds
                                                </p>
                                                <div className="grid grid-cols-1 gap-1.5">
                                                  {cellPeople.filter(p => p.isShepherd).map((p, i) => (
                                                    <div key={i} className={`flex items-center gap-2 border rounded-lg px-2 py-1.5 ${theme.shepherdBg}`}>
                                                      <Avatar person={p} size="sm" accent="border-white/10" />
                                                      <span className="text-[10px] font-bold truncate">{p.name}</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            {/* Members section */}
                                            {cellMemberCount > 0 && (
                                              <div>
                                                <p className="text-[7px] font-black uppercase tracking-widest text-slate-500/70 mb-1.5 px-0.5">
                                                  Members
                                                </p>
                                                <div className="grid grid-cols-1 gap-1.5">
                                                  {cellPeople.filter(p => !p.isShepherd).map((p, i) => (
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
                                      (buscenta.children || []).length === 0 ? (
                                        <p className="text-[8px] text-slate-600 italic pl-1">
                                          No cells in this Buscenta
                                        </p>
                                      ) : (
                                        (buscenta.children || []).map((cell) => {
                                          const isCellSelected =
                                            selectedCellId === cell.id;
                                          const cellLeader = getPrimaryCellShepherd(cell);
                                          const cellPeopleAll = getCellPeople(cell);
                                          const cellShepherdCount = cellPeopleAll.filter(p => p.isShepherd).length;
                                          const cellMemberCount = cellPeopleAll.filter(p => !p.isShepherd).length;

                                          return (
                                            <div
                                              key={cell.id}
                                              className="space-y-1.5"
                                            >
                                              {/* Cell row */}
                                              <button
                                                onClick={() =>
                                                  handleCellSelect(cell.id)
                                                }
                                                className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all duration-200 ${
                                                  isCellSelected
                                                    ? theme.cellActiveBg
                                                    : `${theme.cellBg} hover:brightness-110`
                                                }`}
                                              >
                                                <div className="min-w-0">
                                                  <h6 className="text-[9px] font-black text-white uppercase truncate">
                                                    {cell.name}
                                                  </h6>
                                                  {cellLeader && (
                                                    <p className="text-[8px] text-slate-500 font-bold truncate mt-0.5 uppercase">
                                                      {cellLeader.name}
                                                    </p>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0 ml-1">
                                                  {cellShepherdCount > 0 && (
                                                    <span className="flex items-center gap-0.5 text-[7px] font-black text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-full">
                                                      <Users size={7} />
                                                      {cellShepherdCount}
                                                    </span>
                                                  )}
                                                  <span className="flex items-center gap-1 text-[8px] font-black text-slate-400 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-full">
                                                    <Users size={8} />
                                                    {cellMemberCount}
                                                  </span>
                                                </div>
                                              </button>

                                              {/* ── Members list ── */}
                                              <AnimatePresence>
                                                {isCellSelected && (
                                                  <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden space-y-2 py-1 px-1"
                                                  >
                                                    {cellPeopleAll.length === 0 ? (
                                                      <p className="text-[8px] text-slate-600 italic">
                                                        No members in this cell
                                                      </p>
                                                    ) : (
                                                      <div className="space-y-2">
                                                        {/* Shepherds section */}
                                                        {cellShepherdCount > 0 && (
                                                          <div>
                                                            <p className="text-[7px] font-black uppercase tracking-widest text-violet-400/70 mb-1.5 px-0.5">Shepherds</p>
                                                            <div className="grid grid-cols-1 gap-1.5">
                                                              {cellPeopleAll.filter(p => p.isShepherd).map((p, i) => (
                                                                <div key={i} className={`flex items-center gap-2 border rounded-lg px-2 py-1.5 ${theme.shepherdBg}`}>
                                                                  <Avatar person={p} size="sm" accent="border-white/10" />
                                                                  <span className="text-[10px] font-bold truncate">{p.name}</span>
                                                                </div>
                                                              ))}
                                                            </div>
                                                          </div>
                                                        )}
                                                        {/* Members section */}
                                                        {cellMemberCount > 0 && (
                                                          <div>
                                                            <p className="text-[7px] font-black uppercase tracking-widest text-slate-500/70 mb-1.5 px-0.5">Members</p>
                                                            <div className="grid grid-cols-1 gap-1.5">
                                                              {cellPeopleAll.filter(p => !p.isShepherd).map((p, i) => (
                                                                <div key={i} className={`flex items-center gap-2 border rounded-lg px-2 py-1.5 ${theme.memberBg}`}>
                                                                  <Avatar person={p} size="sm" accent="border-white/10" />
                                                                  <span className="text-[10px] font-bold truncate">{p.name}</span>
                                                                </div>
                                                              ))}
                                                            </div>
                                                          </div>
                                                        )}
                                                      </div>
                                                    )}
                                                  </motion.div>
                                                )}
                                              </AnimatePresence>
                                            </div>
                                          );
                                        })
                                      )
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
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
