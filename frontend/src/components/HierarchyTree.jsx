import { useEffect, useState, useMemo } from "react";
import { fetchHierarchyData } from "../services/hierarchyService";
import {
    ChevronRight,
    ChevronDown,
    User,
    Users,
    FolderTree,
    Search,
    PlusSquare,
    MinusSquare,
    Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ================================
// UTILS
// ================================
function buildTree(flatUnits) {
    const map = {};
    const roots = [];

    // Initialize map
    flatUnits.forEach((unit) => {
        map[unit.id] = { ...unit, children: [] };
    });

    // Connect parents/children
    flatUnits.forEach((unit) => {
        if (unit.parent_id && map[unit.parent_id]) {
            map[unit.parent_id].children.push(map[unit.id]);
        } else {
            roots.push(map[unit.id]);
        }
    });

    return roots;
}

// Recursive Search Filter
// Returns true if node or any child matches search
const filterNodes = (nodes, term) => {
    if (!term) return nodes;

    return nodes.reduce((acc, node) => {
        const matchesSelf = node.name.toLowerCase().includes(term.toLowerCase()) ||
            node.leaders?.some(l => l.name.toLowerCase().includes(term.toLowerCase()));

        const filteredChildren = filterNodes(node.children, term);

        if (matchesSelf || filteredChildren.length > 0) {
            acc.push({
                ...node,
                children: filteredChildren,
                // Force open if children matched or self matched? 
                // We'll handle forceOpen via prop based on search term existence
            });
        }
        return acc;
    }, []);
};

// ================================
// TREE NODE COMPONENT
// ================================
function TreeNode({ node, level = 0, defaultOpen = false }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const hasChildren = node.children && node.children.length > 0;

    // Update open state when defaultOpen changes (e.g. search active)
    useEffect(() => {
        if (defaultOpen) setIsOpen(true);
    }, [defaultOpen]);

    // Visual cues for different unit types
    const getStyles = (type) => {
        switch (type) {
            case 'ZONAL': return {
                bg: 'bg-indigo-500/20',
                border: 'border-indigo-500/50',
                text: 'text-indigo-200',
                icon: <FolderTree size={20} className="text-indigo-400" />
            };
            case 'MC': return {
                bg: 'bg-purple-500/10',
                border: 'border-purple-500/30',
                text: 'text-purple-200',
                icon: <Activity size={18} className="text-purple-400" />
            };
            case 'BUSCENTA': return {
                bg: 'bg-blue-500/10',
                border: 'border-blue-500/30',
                text: 'text-blue-200',
                icon: <Users size={18} className="text-blue-400" />
            };
            case 'CELL': return {
                bg: 'bg-emerald-500/10',
                border: 'border-emerald-500/30',
                text: 'text-emerald-200',
                icon: <User size={16} className="text-emerald-400" />
            };
            default: return {
                bg: 'bg-slate-800',
                border: 'border-slate-700',
                text: 'text-slate-300',
                icon: <div className="w-4" />
            };
        }
    };

    const style = getStyles(node.unit_type);

    return (
        <div className="relative pl-6">
            {/* Connector Lines */}
            {level > 0 && (
                <>
                    {/* Vertical line from parent */}
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-700/50" />
                    {/* Horizontal curve to node */}
                    <div className="absolute left-0 top-8 w-6 h-px bg-slate-700/50" />
                </>
            )}

            <div className="py-2">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`
                        relative group rounded-xl border backdrop-blur-md overflow-hidden transition-all duration-300
                        ${style.bg} ${style.border} hover:border-opacity-100 hover:shadow-lg hover:shadow-purple-500/10
                    `}
                >
                    {/* Header / Clickable Area */}
                    <div
                        className="p-3 flex items-center justify-between cursor-pointer select-none"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        <div className="flex items-center gap-3">
                            {/* Expand Toggle */}
                            <div className={`p-1 rounded-md transition-colors ${hasChildren ? 'hover:bg-white/10 text-slate-400' : 'opacity-0'}`}>
                                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>

                            {/* Icon & Name */}
                            <div className="flex items-center gap-2">
                                {style.icon}
                                <span className={`font-semibold tracking-wide ${style.text}`}>
                                    {node.name}
                                </span>
                                {node.is_placeholder && (
                                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                        Pending
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Quick Stats or Badges could go here */}
                    </div>

                    {/* Leaders Section */}
                    <AnimatePresence>
                        {isOpen && node.leaders && node.leaders.length > 0 && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-white/5 bg-black/20"
                            >
                                <div className="p-3 pl-11 space-y-2">
                                    {node.leaders.map((leader, idx) => (
                                        <div key={idx} className="flex items-center gap-3 group/leader">
                                            <div className="relative w-8 h-8 rounded-full bg-slate-700 overflow-hidden border border-slate-600 shadow-sm shrink-0">
                                                {leader.photo ? (
                                                    <img src={leader.photo} alt={leader.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400 bg-slate-800">
                                                        {leader.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className={`text-sm font-medium ${leader.isPlaceholder ? 'text-yellow-200/50 italic' : 'text-slate-200'}`}>
                                                    {leader.name}
                                                </p>
                                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                                                    {leader.role}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Recursive Children */}
                <AnimatePresence>
                    {isOpen && hasChildren && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="ml-2">
                                {node.children.map(child => (
                                    <TreeNode
                                        key={child.id}
                                        node={child}
                                        level={level + 1}
                                        defaultOpen={defaultOpen}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ================================
// MAIN COMPONENT
// ================================
export default function HierarchyTree() {
    const [originalTree, setOriginalTree] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [forceExpand, setForceExpand] = useState(false);

    // Initial Fetch
    useEffect(() => {
        fetchHierarchyData()
            .then(data => setOriginalTree(buildTree(data)))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    // Filter Logic
    const displayedTree = useMemo(() => {
        if (!searchTerm) return originalTree;
        return filterNodes(originalTree, searchTerm);
    }, [originalTree, searchTerm]);

    const isFiltered = useMemo(() => searchTerm.length > 0, [searchTerm]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
            <p className="text-slate-400 animate-pulse">Loading Structure...</p>
        </div>
    );

    if (error) return (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
            <h3 className="text-red-400 font-bold mb-2">Failed to load hierarchy</h3>
            <p className="text-red-300/70 text-sm">{error}</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
            {/* Header / Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        Organizational Structure
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        {displayedTree.reduce((acc, n) => acc + 1 + (n.children?.length || 0), 0)}+ Active Units
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Expanding Controls */}
                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                        <button
                            onClick={() => setForceExpand(true)}
                            className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                            title="Expand All"
                        >
                            <PlusSquare size={18} />
                        </button>
                        <button
                            onClick={() => setForceExpand(false)}
                            className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                            title="Collapse All"
                        >
                            <MinusSquare size={18} />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Find person or unit..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 w-64 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600 text-slate-200"
                        />
                    </div>
                </div>
            </div>

            {/* Tree Rendering */}
            <div className="min-h-[500px] relative">
                {displayedTree.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <FolderTree size={48} className="mx-auto mb-4 text-slate-600" />
                        <p className="text-lg font-medium text-slate-400">No matching units found</p>
                        <p className="text-sm text-slate-600">Try adjusting your search filters</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {displayedTree.map((node) => (
                            <TreeNode
                                key={node.id}
                                node={node}
                                defaultOpen={isFiltered || forceExpand}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
