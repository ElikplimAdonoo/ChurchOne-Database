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
    // Agape — slate/neutral
    columnTint: "bg-slate-900/10 border border-slate-800/30",
    textBg: "bg-slate-950/95 border-t border-slate-800/60",
    textColor: "text-slate-400",
    accentText: "text-slate-300",
  },
  {
    // Dunamis — pink/rose
    columnTint: "bg-rose-950/10 border border-rose-900/20",
    textBg: "bg-rose-950/95 border-t border-rose-900/40",
    textColor: "text-rose-400",
    accentText: "text-rose-300",
  },
  {
    // Media/other — blue
    columnTint: "bg-blue-950/10 border border-blue-900/20",
    textBg: "bg-blue-950/95 border-t border-blue-900/40",
    textColor: "text-blue-400",
    accentText: "text-blue-300",
  },
  {
    // New Testament — teal/green (was purple, now matches Soul Winners vibe but distinct)
    columnTint: "bg-teal-950/10 border border-teal-900/20",
    textBg: "bg-teal-950/95 border-t border-teal-900/40",
    textColor: "text-teal-400",
    accentText: "text-teal-300",
  },
  {
    // Soul Winners — purple
    columnTint: "bg-purple-950/10 border border-purple-900/20",
    textBg: "bg-purple-950/95 border-t border-purple-900/40",
    textColor: "text-purple-400",
    accentText: "text-purple-300",
  },
  {
    // Extra — amber
    columnTint: "bg-amber-950/10 border border-amber-900/20",
    textBg: "bg-amber-950/95 border-t border-amber-900/40",
    textColor: "text-amber-400",
    accentText: "text-amber-300",
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
            className="flex gap-5 w-max mx-auto"
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

              return (
                <div
                  key={mc.id}
                  className="flex flex-col items-center"
                  style={{ width: 220, scrollSnapAlign: "center" }}
                >
                  {/* Connector: horizontal bar across all columns + vertical drop into each */}
                  <div className="w-full flex flex-col items-center">
                    {/* Horizontal bar — uses extensions to span half or full gap */}
                    <div className="w-full h-0.5 relative">
                      {/* Left extension for non-first columns */}
                      {idx > 0 && (
                        <div className="absolute right-1/2 top-0 h-0.5 bg-slate-700/60" style={{ width: 'calc(50% + 10px)' }} />
                      )}
                      {/* Right extension for non-last columns */}
                      {idx < filteredMCs.length - 1 && (
                        <div className="absolute left-1/2 top-0 h-0.5 bg-slate-700/60" style={{ width: 'calc(50% + 10px)' }} />
                      )}
                    </div>
                    {/* Vertical drop line from horizontal bar into MC card */}
                    <div className="w-0.5 h-5 bg-slate-700/60" />
                  </div>

                  {/* ── MC Card ──
                      Fix 3: image uses object-[center_20%] to show face, not scalp */}
                  <div className="w-full rounded-3xl overflow-hidden border border-slate-800 shadow-xl bg-slate-900 hover:scale-[1.01] transition-all duration-300">
                    {/* Photo */}
                    <div className="w-full h-48 bg-slate-950 overflow-hidden">
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

                    {/* Name plate */}
                    <div className={`px-4 py-3.5 ${theme.textBg}`}>
                      {/* Role badge — for CELL units always show "CELL SHEPHERD" regardless of DB role string */}
                      <span className="inline-block mb-1.5 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-white/5 border border-white/10 rounded text-slate-500">
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

                  {/* Connector to content column */}
                  <div className="w-0.5 h-5 bg-slate-700/60" />

                  {/* ── Content Column (adapts label based on unit_type) ── */}
                  <div
                    className={`w-full rounded-[28px] p-3.5 space-y-3 min-h-[160px] ${theme.columnTint}`}
                  >
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
                        <div className="space-y-3">
                          {shepherds.length > 0 && (
                            <div>
                              <p className="text-[7px] font-black uppercase tracking-widest text-violet-400/70 mb-1.5 px-0.5">
                                Shepherds
                              </p>
                              <div className="grid grid-cols-1 gap-1.5">
                                {shepherds.map((p, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center gap-2 bg-violet-950/10 border border-violet-500/20 rounded-xl p-2"
                                  >
                                    <Avatar
                                      person={p}
                                      size="sm"
                                      accent="border-violet-500/30"
                                    />
                                    <span className="text-[10px] text-violet-300 font-bold">
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
                                    className="flex items-center gap-2 bg-slate-900/50 border border-white/5 rounded-xl p-2"
                                  >
                                    <Avatar
                                      person={p}
                                      size="sm"
                                      accent="border-white/10"
                                    />
                                    <span className="text-[10px] text-slate-300 font-bold">
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
                        // Determine if this child is a CELL (so we show members, not child units)
                        const isCell = buscenta.unit_type === "CELL";
                         // For cells: prefer exact 'cell shepherd' role, else fall back to first leader
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
                                  ? "bg-slate-900 border-church-blue-500/60"
                                  : "bg-slate-900/50 border-white/5 hover:bg-slate-800/70 hover:border-white/10"
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
                                  {/* Only show sub-unit count for non-cell units */}
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
                                  className="overflow-hidden pl-2 border-l-2 border-slate-800/80 ml-4 space-y-2 py-1"
                                >
                                  {isCell ? (
                                    // CELL units: show shepherds first, then members
                                    (() => {
                                      const cellPeople = getCellPeople(buscenta);
                                      return cellPeople.length === 0 ? (
                                        <p className="text-[8px] text-slate-600 italic pl-1">
                                          No members in this cell
                                        </p>
                                      ) : (
                                        <div className="overflow-hidden bg-black/30 border border-white/5 rounded-xl p-2.5 ml-1">
                                          {/* Shepherds section */}
                                          {cellPeople.some(p => p.isShepherd) && (
                                            <div className="mb-2">
                                              <p className="text-[7px] font-black uppercase tracking-widest text-violet-400/70 mb-1.5 px-0.5">
                                                Shepherds
                                              </p>
                                              <div className="grid grid-cols-1 gap-1.5">
                                                {cellPeople.filter(p => p.isShepherd).map((p, i) => (
                                                  <div key={i} className="flex items-center gap-2 bg-violet-950/10 border border-violet-500/20 rounded-lg px-2 py-1.5">
                                                    <Avatar person={p} size="sm" accent="border-violet-500/30" />
                                                    <span className="text-[10px] text-violet-300 font-bold">{p.name}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          {/* Members section */}
                                          {cellPeople.some(p => !p.isShepherd) && (
                                            <div>
                                              <p className="text-[7px] font-black uppercase tracking-widest text-slate-500/70 mb-1.5 px-0.5">
                                                Members
                                              </p>
                                              <div className="grid grid-cols-1 gap-1.5">
                                                {cellPeople.filter(p => !p.isShepherd).map((p, i) => (
                                                  <div key={i} className="flex items-center gap-2">
                                                    <Avatar person={p} size="sm" accent="border-white/10" />
                                                    <span className="text-[10px] text-slate-300 font-bold truncate">{p.name}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()
                                  ) : (
                                    // BUSCENTA/higher units: show their child cells
                                    (buscenta.children || []).length === 0 ? (
                                      <p className="text-[8px] text-slate-600 italic pl-1">
                                        No cells in this Buscenta
                                      </p>
                                    ) : (
                                      (buscenta.children || []).map((cell) => {
                                        const isCellSelected =
                                          selectedCellId === cell.id;
                                        // Always use getPrimaryCellShepherd so role="Shepherd" cells show correctly
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
                                                  ? "bg-slate-950 border-church-blue-500/40"
                                                  : "bg-slate-950/50 border-white/5 hover:bg-slate-900"
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
                                                  initial={{
                                                    opacity: 0,
                                                    height: 0,
                                                  }}
                                                  animate={{
                                                    opacity: 1,
                                                    height: "auto",
                                                  }}
                                                  exit={{
                                                    opacity: 0,
                                                    height: 0,
                                                  }}
                                                  className="overflow-hidden bg-black/30 border border-white/5 rounded-xl p-2.5 ml-1"
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
                                                              <div key={i} className="flex items-center gap-2 bg-violet-950/10 border border-violet-500/20 rounded-lg px-2 py-1.5">
                                                                <Avatar person={p} size="sm" accent="border-violet-500/30" />
                                                                <span className="text-[10px] text-violet-300 font-bold">{p.name}</span>
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
                                                              <div key={i} className="flex items-center gap-2">
                                                                <Avatar person={p} size="sm" accent="border-white/10" />
                                                                <span className="text-[10px] text-slate-300 font-bold truncate">{p.name}</span>
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
