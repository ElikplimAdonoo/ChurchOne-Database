import { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
    // 4 — Blue (New Testament MC)
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

function countDescendantMembers(node) {
  const direct = node.members?.length || 0;
  const fromChildren = (node.children || []).reduce(
    (sum, child) => sum + countDescendantMembers(child),
    0
  );
  return direct + fromChildren;
}

// Custom hook to detect window size for responsive layouts
function useWindowSize() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return width;
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
  const leaders = unit.leaders || [];
  return leaders.find(l => l.role?.toLowerCase() === 'cell shepherd') || null;
}

function getCellPeople(unit) {
  const list = [];
  const leaders = unit.leaders || [];
  const primary = getPrimaryCellShepherd(unit);
  const primaryId = primary?.id || primary?.person_id;

  leaders.forEach(l => {
    const lId = l.id || l.person_id;
    if (primaryId && lId === primaryId) return;
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

  const [selectedL2Id, setSelectedL2Id] = useState(null);
  const [selectedL3Id, setSelectedL3Id] = useState(null);
  const [selectedL4Id, setSelectedL4Id] = useState(null);
  const [selectedL5Id, setSelectedL5Id] = useState(null);

  const l3Ref = useRef(null);
  const l4Ref = useRef(null);
  const l5Ref = useRef(null);
  const scrollContainerRef = useRef(null);

  const windowWidth = useWindowSize();
  const isMobile = windowWidth < 640;

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

  const activeZone = tree[activeZoneIndex];

  // Reset on zone change
  useEffect(() => {
    setSelectedL2Id(null);
    setSelectedL3Id(null);
    setSelectedL4Id(null);
    setSelectedL5Id(null);
  }, [activeZoneIndex]);

  // Auto-scroll newly opened panels into view inside the horizontal container
  const scrollToRef = (ref) => {
    if (ref.current && scrollContainerRef.current) {
      setTimeout(() => {
        ref.current.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center"
        });
      }, 250);
    }
  };

  useEffect(() => {
    if (selectedL2Id) scrollToRef(l3Ref);
  }, [selectedL2Id]);

  useEffect(() => {
    if (selectedL3Id) scrollToRef(l4Ref);
  }, [selectedL3Id]);

  useEffect(() => {
    if (selectedL4Id) scrollToRef(l5Ref);
  }, [selectedL4Id]);

  const handleL2Click = useCallback((id) => {
    setSelectedL2Id(prev => prev === id ? null : id);
    setSelectedL3Id(null);
    setSelectedL4Id(null);
    setSelectedL5Id(null);
  }, []);

  const handleL3Click = useCallback((id) => {
    setSelectedL3Id(prev => prev === id ? null : id);
    setSelectedL4Id(null);
    setSelectedL5Id(null);
  }, []);

  const handleL4Click = useCallback((id) => {
    setSelectedL4Id(prev => prev === id ? null : id);
    setSelectedL5Id(null);
  }, []);

  const handleL5Click = useCallback((id) => {
    setSelectedL5Id(prev => prev === id ? null : id);
  }, []);

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

  // Derived selections
  const allL2Items = useMemo(() => {
    return filteredMCs.flatMap(mc => mc.children || []);
  }, [filteredMCs]);

  const selectedL2Node = useMemo(() => {
    return allL2Items.find(item => item.id === selectedL2Id) || null;
  }, [allL2Items, selectedL2Id]);

  const l3Items = useMemo(() => {
    return selectedL2Node?.children || [];
  }, [selectedL2Node]);

  const selectedL3Node = useMemo(() => {
    return l3Items.find(item => item.id === selectedL3Id) || null;
  }, [l3Items, selectedL3Id]);

  const l4Items = useMemo(() => {
    return selectedL3Node?.children || [];
  }, [selectedL3Node]);

  const selectedL4Node = useMemo(() => {
    return l4Items.find(item => item.id === selectedL4Id) || null;
  }, [l4Items, selectedL4Id]);

  // Find the theme of the active L2 item's parent MC column
  const activeMcIdx = useMemo(() => {
    return filteredMCs.findIndex(mc => (mc.children || []).some(c => c.id === selectedL2Id));
  }, [filteredMCs, selectedL2Id]);

  const activeTheme = useMemo(() => {
    return MC_THEMES[(activeMcIdx >= 0 ? activeMcIdx : 0) % MC_THEMES.length];
  }, [activeMcIdx]);

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

  // Renders a premium column-shaped panel for sub-units
  const renderColumnPanel = (selectedNode, ref, selectedChildId, onChildClick, theme) => {
    if (!selectedNode) return null;

    const isCell = selectedNode.unit_type === "CELL";
    const label = `${selectedNode.name}`;
    const subtitle = isCell ? "People" : getChildLabel(selectedNode.unit_type);

    if (isCell) {
      const people = getCellPeople(selectedNode);
      const shepherds = people.filter(p => p.isShepherd);
      const members = people.filter(p => !p.isShepherd);

      return (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-[220px] shrink-0 bg-slate-900 border border-white/10 rounded-3xl p-4 shadow-2xl flex flex-col gap-3 self-start"
        >
          {/* Header */}
          <div>
            <span className={`text-[7.5px] font-black uppercase tracking-widest ${theme.textColor}`}>
              {subtitle}
            </span>
            <h4 className="text-[11px] font-black text-white leading-tight uppercase tracking-tight truncate mt-0.5">
              {label}
            </h4>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-0.5 max-h-[340px]">
            {people.length === 0 ? (
              <p className="text-[9px] text-slate-500 italic py-4 text-center">No one in this cell yet</p>
            ) : (
              <>
                {shepherds.length > 0 && (
                  <div>
                    <p className={`text-[7px] font-black uppercase tracking-wider ${theme.textColor} mb-1.5`}>
                      Shepherds
                    </p>
                    <div className="space-y-1.5">
                      {shepherds.map((p, i) => (
                        <div
                          key={`shep-${i}`}
                          className={`flex items-center gap-2 border rounded-xl p-2 ${theme.shepherdBg}`}
                        >
                          <Avatar person={p} size="sm" accent="border-white/10" />
                          <span className="text-[10px] font-bold text-white truncate">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {members.length > 0 && (
                  <div>
                    <p className="text-[7px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Members
                    </p>
                    <div className="space-y-1.5">
                      {members.map((m, i) => (
                        <div
                          key={`mem-${i}`}
                          className={`flex items-center gap-2 border rounded-xl p-2 ${theme.memberBg}`}
                        >
                          <Avatar person={m} size="sm" accent="border-white/10" />
                          <span className="text-[10px] font-bold text-slate-200 truncate">{m.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      );
    }

    const children = selectedNode.children || [];
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, x: -15 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-[220px] shrink-0 bg-slate-900 border border-white/10 rounded-3xl p-4 shadow-2xl flex flex-col gap-3 self-start"
      >
        {/* Header */}
        <div>
          <span className={`text-[7.5px] font-black uppercase tracking-widest ${theme.textColor}`}>
            {subtitle}
          </span>
          <h4 className="text-[11px] font-black text-white leading-tight uppercase tracking-tight truncate mt-0.5">
            {label}
          </h4>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-0.5 max-h-[340px]">
          {children.length === 0 ? (
            <p className="text-[9px] text-slate-500 italic py-4 text-center">
              No {getChildLabel(selectedNode.unit_type).toLowerCase()} yet
            </p>
          ) : (
            children.map((child) => {
              const isSel = selectedChildId === child.id;
              const isChildCell = child.unit_type === "CELL";
              const leader = isChildCell
                ? getPrimaryCellShepherd(child)
                : child.leaders?.[0];
              const subUnits = isChildCell ? 0 : (child.children?.length || 0);
              const totalMem = isChildCell
                ? ((child.members?.length || 0) + (child.leaders?.length || 0))
                : countDescendantMembers(child);

              return (
                <button
                  key={child.id}
                  onClick={() => onChildClick(child.id)}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-2xl text-left border transition-all duration-200 shadow-sm ${
                    isSel ? theme.buscentaActiveBg : `${theme.buscentaBg} hover:brightness-110`
                  }`}
                >
                  <Avatar person={leader} size="sm" accent="border-white/10" />
                  <div className="min-w-0 flex-1">
                    <h5 className="text-[9px] font-black text-white leading-tight uppercase tracking-tight truncate">
                      {isChildCell ? child.name : (leader?.name || "No Leader")}
                    </h5>
                    <p className="text-[7.5px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 truncate">
                      {isChildCell ? (leader?.name || "No Shepherd") : child.name}
                    </p>
                    <div className="flex items-center gap-2.5 mt-1">
                      {!isChildCell && (
                        <span className="text-[7px] text-slate-400 flex items-center gap-0.5 font-bold">
                          <Home size={8} className="shrink-0" />
                          <span className="font-black text-white">{subUnits}</span>
                        </span>
                      )}
                      <span className="text-[7px] text-slate-400 flex items-center gap-0.5 font-bold">
                        <Users size={8} className="shrink-0" />
                        <span className="font-black text-white">{totalMem}</span>
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    size={8}
                    className={`text-slate-600 transition-transform duration-300 shrink-0 ${
                      isSel ? "rotate-90 text-church-blue-400" : ""
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>
      </motion.div>
    );
  };

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

      {/* ── Hierarchy Tree Container ── */}
      <div className="flex flex-col w-full">
        {/* ── Active Zone Head Card ── */}
        {activeZone && (
          <div className="flex flex-col items-center">
            {(() => {
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

            {/* ── CELL-level zone view ── */}
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

        {/* ── Columns (L1 columns, L2 items, and inline L3-L5 expansion panels) ── */}
        {filteredMCs.length > 0 && (
          <div
            ref={scrollContainerRef}
            className="w-full overflow-x-auto -mx-2 px-2 no-scrollbar"
          >
            <div
              className="flex gap-0 w-max mx-auto"
              style={{ scrollSnapType: isMobile ? "x mandatory" : "none" }}
            >
              {filteredMCs.map((mc, idx) => {
                const theme = MC_THEMES[idx % MC_THEMES.length];
                const mcLeader = mc.unit_type === 'CELL'
                  ? mc.leaders?.find(l => l.role?.toLowerCase() === 'cell shepherd') || null
                  : mc.leaders?.[0];

                const childCount = mc.unit_type === "CELL"
                  ? (mc.members?.length || 0) + (mc.leaders?.length || 0)
                  : (mc.children?.length || 0);

                const isFirst = idx === 0;
                const isLast = idx === filteredMCs.length - 1;
                const roundedClass = isFirst && isLast 
                  ? "rounded-3xl" 
                  : isFirst 
                  ? "rounded-l-3xl" 
                  : isLast 
                  ? "rounded-r-3xl" 
                  : "";

                const hasSelectedL2 = (mc.children || []).some(c => c.id === selectedL2Id);

                return (
                  <div key={mc.id} className="flex items-start shrink-0">
                    {/* Main Column */}
                    <div
                      className="flex flex-col items-center shrink-0"
                      style={{ width: 220, scrollSnapAlign: "center" }}
                    >
                      {/* Connector lines */}
                      <div className="w-full flex flex-col items-center">
                        <div className="w-full h-0.5 relative">
                          {idx > 0 && (
                            <div className="absolute right-1/2 top-0 h-0.5 bg-slate-700/60" style={{ width: '50%' }} />
                          )}
                          {idx < filteredMCs.length - 1 && (
                            <div className="absolute left-1/2 top-0 h-0.5 bg-slate-700/60" style={{ width: '50%' }} />
                          )}
                        </div>
                        <div className="w-0.5 h-5 bg-slate-700/60" />
                      </div>

                      {/* MC Photo Card */}
                      <div className="w-full px-1.5 shrink-0 relative z-10">
                        <div className="w-full rounded-2xl overflow-hidden border border-white/5 shadow-xl bg-slate-950/80 hover:scale-[1.01] transition-all duration-300">
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

                      {/* Column Lane Container */}
                      <div
                        className={`w-full flex flex-col pb-6 min-h-[380px] relative overflow-hidden ${roundedClass} border-r border-slate-800/40 last:border-r-0 z-0`}
                        style={{ marginTop: '-165px' }}
                      >
                        <div className="absolute inset-0 flex flex-col pointer-events-none -z-10">
                          <div className={`w-full h-[165px] ${theme.darkTint}`} />
                          <div className={`w-full flex-1 ${theme.lightTint}`} />
                        </div>

                        <div className="w-full shrink-0 pointer-events-none" style={{ height: 165 }} />

                        {/* Content Area */}
                        <div className="w-full flex flex-col px-2.5 gap-3 mt-1">
                          {mc.unit_type !== 'CELL' && (
                            <div className="flex items-center justify-between px-1 mb-0.5">
                              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                                {getChildLabel(mc.unit_type)}
                              </span>
                              <span className="text-[8px] font-black text-slate-500 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-full">
                                {childCount}
                              </span>
                            </div>
                          )}

                          {childCount === 0 && (
                            <p className="text-[9px] text-slate-600 italic text-center py-4">
                              {mc.unit_type === 'CELL'
                               ? 'No shepherds or members in this cell yet'
                                : `No ${getChildLabel(mc.unit_type).toLowerCase()} yet`}
                            </p>
                          )}

                          {/* CELL-type MC: show directly */}
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
                                        <div
                                          key={i}
                                          className={`flex items-center gap-2 border rounded-xl p-2 ${theme.memberBg}`}
                                        >
                                          <Avatar person={p} size="sm" accent="border-white/10" />
                                          <span className="text-[10px] font-bold truncate">{p.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Non-CELL MC: render Level 2 nodes vertically inside the column */}
                          {mc.unit_type !== "CELL" &&
                            (mc.children || []).map((l2) => {
                              const isSelected = selectedL2Id === l2.id;
                              const isL2Cell = l2.unit_type === "CELL";
                              const l2Leader = isL2Cell
                                ? getPrimaryCellShepherd(l2)
                                : l2.leaders?.[0];
                              const subUnits = isL2Cell ? 0 : (l2.children?.length || 0);
                              const totalMem = isL2Cell
                                ? ((l2.members?.length || 0) + (l2.leaders?.length || 0))
                                : countDescendantMembers(l2);

                              return (
                                <button
                                  key={l2.id}
                                  onClick={() => handleL2Click(l2.id)}
                                  className={`w-full flex items-center gap-2.5 p-3 rounded-2xl text-left border transition-all duration-200 shadow-sm ${
                                    isSelected ? theme.buscentaActiveBg : `${theme.buscentaBg} hover:brightness-110`
                                  }`}
                                >
                                  <Avatar person={l2Leader} size="sm" accent="border-white/10" />
                                  <div className="min-w-0 flex-1">
                                    <h5 className="text-[10px] font-black text-white leading-tight uppercase tracking-tight truncate">
                                      {isL2Cell ? l2.name : (l2Leader?.name || "No Leader")}
                                    </h5>
                                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 truncate">
                                      {isL2Cell ? (l2Leader?.name || "No Shepherd Assigned") : l2.name}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1">
                                      {!isL2Cell && (
                                        <span className="text-[8px] text-slate-400 flex items-center gap-1 font-bold">
                                          <Home size={9} className="shrink-0" />
                                          <span className="font-black text-white">{subUnits}</span>
                                        </span>
                                      )}
                                      <span className="text-[8px] text-slate-400 flex items-center gap-1 font-bold">
                                        <Users size={9} className="shrink-0" />
                                        <span className="font-black text-white">{totalMem}</span>
                                      </span>
                                    </div>
                                  </div>
                                  <ChevronRight
                                    size={10}
                                    className={`text-slate-600 transition-transform duration-300 shrink-0 ${
                                      isSelected ? "rotate-90 text-church-blue-400" : ""
                                    }`}
                                  />
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    </div>

                    {/* ── Inline Horizontal Expansion Panels (L3-L5) ── */}
                    {hasSelectedL2 && selectedL2Node && (
                      <div
                        className="flex items-start gap-4 px-4 self-stretch border-r border-slate-800/20 bg-slate-950/15 transition-all duration-300"
                        style={{ paddingTop: 195 }}
                      >
                        {/* L3 Panel */}
                        {renderColumnPanel(selectedL2Node, l3Ref, selectedL3Id, handleL3Click, theme)}

                        {/* L4 Panel */}
                        {selectedL3Node && (
                          <>
                            {renderColumnPanel(selectedL3Node, l4Ref, selectedL4Id, handleL4Click, theme)}

                            {/* L5 Panel */}
                            {selectedL4Node && (
                              <>
                                {renderColumnPanel(selectedL4Node, l5Ref, selectedL5Id, handleL5Click, theme)}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

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
