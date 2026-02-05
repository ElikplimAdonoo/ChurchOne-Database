import { useEffect, useCallback, useState, useMemo } from 'react';
import ReactFlow, {
    useNodesState,
    useEdgesState,
    addEdge,
    Controls,
    Background,
    MiniMap,
    Position,
    ConnectionLineType,
    MarkerType
} from 'reactflow';
import { stratify, tree, hierarchy } from 'd3-hierarchy';
import { Search, ChevronRight } from 'lucide-react';
import 'reactflow/dist/style.css';
import { useForm } from 'react-hook-form';
import { createUnit, fetchHierarchyData } from '../services/hierarchyService';
import CollapsibleNode from './CollapsibleNode';
import NodeDetailsPanel from './NodeDetailsPanel';
import Modal from './ui/Modal';

const nodeTypes = {
    mindMapNode: CollapsibleNode
};

// --- LAYOUT ENGINE (D3) ---
const layoutTree = (flatData, collapsedIds) => {
    if (!flatData || flatData.length === 0) return { nodes: [], edges: [] };

    // 1. Convert flat list to Hierarchy
    // We need to handle potential broken roots. We assume 'active' roots have no parents in the list.
    // D3 needs a single root. We can create a synthetic root if multiple exist.

    // Create a map for fast lookup
    const dataMap = new Map(flatData.map(d => [d.id, { ...d }]));

    // Find absolute roots (nodes whose parent doesn't exist in the current dataset)
    const roots = flatData.filter(d => !d.parent_id || !dataMap.has(d.parent_id));

    // If multiple roots, create a synthetic "Church" root
    let rootData = roots[0];
    if (roots.length > 1) {
        rootData = { id: 'root', name: 'Church Structure', unit_type: 'ROOT', children: [] };
        // We'll handle connecting these manually or assume the data is good.
        // For now, let's just pick the first Zonal/Root we find generally.
    }

    // Stratify turns flat data into a tree structure
    // We need to filter out collapsed branches BEFORE stratifying to avoid D3 calculating them

    // Recursive visibility check
    const isVisible = (nodeId) => {
        // A node is visible if its parent is visible AND parent is not collapsed.
        // This is hard with flat data. EASIER: Build full tree, prune, then layout.
        return true;
    };

    // Build Adjacency List
    const childrenMap = new Map();
    flatData.forEach(d => {
        if (d.parent_id) {
            if (!childrenMap.has(d.parent_id)) childrenMap.set(d.parent_id, []);
            childrenMap.get(d.parent_id).push(d);
        }
    });

    // Traverse and Prune
    // We start from the roots.
    const nodes = [];
    const edges = [];

    const traverse = (node, x, y, level) => {
        // This will be replaced by D3 Tree
    };

    // --- ACTUAL D3 IMPLEMENTATION ---
    // 1. Build simple hierarchy object for D3
    const buildHierarchy = (parentId) => {
        const kids = childrenMap.get(parentId) || [];
        const result = {
            id: parentId,
            ...dataMap.get(parentId),
            children: collapsedIds.has(parentId) ? [] : kids.map(k => buildHierarchy(k.id))
        };
        // Remove empty children array for D3 leaf nodes
        if (result.children.length === 0) delete result.children;
        return result;
    }

    // Use the first root found
    if (roots.length === 0) return { nodes: [], edges: [] };
    const rootId = roots[0].id;
    const hierarchyData = buildHierarchy(rootId);

    // 2. Compute Layout
    const root = hierarchy(hierarchyData);

    // Separation: ensure nodes don't overlap vertically
    const nodeSize = [250, 60]; // Width, Height (Spacing)

    // Tree Layout (Horizontal)
    // nodeSize is [height, width] for horizontal tree in D3 terms
    const treeLayout = tree()
        .nodeSize([80, 280]) // [Vertical Spacing, Horizontal Spacing]
        .separation((a, b) => (a.parent === b.parent ? 1 : 1.2)); // More space between different branches

    treeLayout(root);

    // 3. Convert back to ReactFlow
    root.descendants().forEach(d => {
        // D3 xy is switched for horizontal layout usually, but nodeSize handles usage
        // For horizontal: x=depth (y), y=breadth (x)
        // Actually d3.tree produces x,y coordinates.
        // For horizontal layour: d.y is horizontal position (depth), d.x is vertical (breadth)

        nodes.push({
            id: d.data.id,
            type: 'mindMapNode',
            position: { x: d.y, y: d.x }, // Horizontal Tree
            data: {
                label: d.data.name,
                unit_type: d.data.unit_type,
                hasChildren: (childrenMap.get(d.data.id)?.length > 0),
                isCollapsed: collapsedIds.has(d.data.id),
                leaders: d.data.leaders,
                id: d.data.id
            },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            style: getStyle(d.data.unit_type)
        });

        if (d.parent) {
            edges.push({
                id: `e${d.parent.data.id}-${d.data.id}`,
                source: d.parent.data.id,
                target: d.data.id,
                type: 'default', // Bezier is default
                style: { stroke: '#475569', strokeWidth: 2 },
                animated: false
            });
        }
    });

    return { nodes, edges };
};

// --- STYLES ---
const baseStyle = {
    background: '#1e293b',
    color: '#e2e8f0',
    border: '1px solid #334155',
    borderRadius: '20px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '500',
    width: 'auto',
    minWidth: '180px',
    textAlign: 'center',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
    transition: 'all 0.3s ease'
};

const getStyle = (type, isSelected) => {
    let style = { ...baseStyle };
    if (isSelected) {
        style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.5), 0 8px 12px -2px rgba(0, 0, 0, 0.4)'; // Glow
        style.borderColor = '#6366f1';
        style.transform = 'scale(1.05)';
        style.zIndex = 100;
    }

    switch (type) {
        case 'ZONAL': return { ...style, borderLeftColor: '#6366f1', borderLeftWidth: '4px', background: isSelected ? '#312e81' : '#1e1b4b' };
        case 'MC': return { ...style, borderLeftColor: '#a855f7', borderLeftWidth: '4px' };
        case 'BUSCENTA': return { ...style, borderLeftColor: '#3b82f6', borderLeftWidth: '4px' };
        case 'CELL': return { ...style, borderLeftColor: '#10b981', borderLeftWidth: '4px' };
        case 'PERSON': return {
            ...style,
            background: isSelected ? '#1e293b' : '#0f172a',
            borderTop: isSelected ? '1px solid #6366f1' : '1px solid #1e293b',
            borderRight: isSelected ? '1px solid #6366f1' : '1px solid #1e293b',
            borderBottom: isSelected ? '1px solid #6366f1' : '1px solid #1e293b',
            borderLeft: isSelected ? '4px solid #6366f1' : '4px solid #cbd5e1',
            // Note: If isSelected, we want to match the selection style, otherwise the gray accent.
            // Wait, previous code had `border: ...` AND `borderLeft: ...`. 
            // To fix warning, we should just NOT use `border` shorthand if we use `borderLeft`.
            color: '#94a3b8',
            minWidth: '150px',
            fontSize: '12px'
        };
        default: return style;
    }
};


export default function HierarchyMindMap() {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [rfInstance, setRfInstance] = useState(null);

    // Data State
    const [flatData, setFlatData] = useState([]);
    const [collapsedIds, setCollapsedIds] = useState(new Set());

    // UI State
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    // Toggle Handler
    const handleToggle = useCallback((nodeId) => {
        setCollapsedIds(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) next.delete(nodeId);
            else next.add(nodeId);
            return next;
        });
    }, []);

    // Selection Handler (Click on Node)
    const onNodeClick = useCallback((event, node) => {
        setSelectedNodeId(node.id);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNodeId(null);
    }, []);

    // Search Handler
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const q = searchQuery.toLowerCase();
        const results = flatData.filter(d =>
            d.name.toLowerCase().includes(q) ||
            (d.leaders && d.leaders.some(l => l.name.toLowerCase().includes(q)))
        );

        setSearchResults(results.map(r => r.id));
    }, [searchQuery, flatData]);

    const handleSearchResultClick = (id) => {
        const node = nodes.find(n => n.id === id);
        if (node && rfInstance) {
            setSelectedNodeId(id);
            rfInstance.setCenter(node.position.x, node.position.y, { zoom: 1.2, duration: 800 });
            setSearchQuery('');
        }
    };


    // Modal State
    const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
    const [targetParent, setTargetParent] = useState(null);
    const { register, handleSubmit, reset, setValue } = useForm();

    // Data Fetching
    const refreshData = useCallback(() => {
        fetchHierarchyData().then(units => {
            const hierarchyNodes = units.map(unit => ({
                id: unit.id,
                name: unit.name,
                unit_type: unit.unit_type,
                parent_id: unit.parent_id,
                leaders: unit.leaders || []
            }));
            setFlatData(hierarchyNodes);
        });
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const handleAddChild = useCallback((parentNode) => {
        setTargetParent(parentNode);

        // Auto-suggest child type
        let childType = 'CELL';
        const pType = parentNode.data.unit_type;
        if (pType === 'ROOT') childType = 'ZONAL';
        else if (pType === 'ZONAL') childType = 'MC';
        else if (pType === 'MC') childType = 'BUSCENTA';
        else if (pType === 'BUSCENTA') childType = 'CELL';

        setValue('unit_type', childType);
        setIsUnitModalOpen(true);
    }, [setValue]);

    const onSubmitUnit = async (data) => {
        try {
            await createUnit({
                name: data.name,
                unit_type: data.unit_type,
                parent_id: targetParent?.id,
                order_index: 0 // Default for now
            });
            setIsUnitModalOpen(false);
            reset();
            refreshData(); // Reload tree
        } catch (error) {
            console.error('Failed to create unit:', error);
        }
    };

    // Layout Effect
    useEffect(() => {
        if (flatData.length === 0) return;

        const layout = layoutTree(flatData, collapsedIds);

        const activeNodes = layout.nodes.map(n => ({
            ...n,
            data: {
                ...n.data,
                onToggle: handleToggle,
                // Pass selection state to node component if needed, 
                // but style updates are handled here
            },
            style: {
                ...getStyle(n.data.unit_type, n.id === selectedNodeId),
                // Dim non-selected if something IS selected? Maybe too complex for now.
                opacity: (searchResults.length > 0 && !searchResults.includes(n.id) && !selectedNodeId) ? 0.3 : 1
            }
        }));

        setNodes(activeNodes);

        // Highlight Connected Edges
        const activeEdges = layout.edges.map(e => ({
            ...e,
            style: {
                stroke: (selectedNodeId && (e.source === selectedNodeId || e.target === selectedNodeId))
                    ? '#6366f1' // Highlighted
                    : '#475569', // Default
                strokeWidth: (selectedNodeId && (e.source === selectedNodeId || e.target === selectedNodeId)) ? 3 : 1.5,
                opacity: (searchResults.length > 0 && !searchResults.includes(e.source) && !searchResults.includes(e.target) && !selectedNodeId) ? 0.3 : 1
            },
            animated: selectedNodeId && (e.source === selectedNodeId || e.target === selectedNodeId)
        }));

        setEdges(activeEdges);

    }, [flatData, collapsedIds, handleToggle, selectedNodeId, searchResults, setNodes, setEdges]);

    const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    // Derived Selected Node Data
    const selectedNodeData = useMemo(() => {
        return nodes.find(n => n.id === selectedNodeId);
    }, [nodes, selectedNodeId]);

    return (
        <div className="h-full w-full bg-slate-950 relative overflow-hidden">

            {/* Search Overlay */}
            <div className="absolute top-6 left-6 z-50 w-80">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search map..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500/50 shadow-lg text-slate-200"
                    />

                    {/* Search Results Dropdown */}
                    {searchQuery && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur border border-slate-700/50 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                            {flatData.filter(d => searchResults.includes(d.id)).slice(0, 10).map(result => (
                                <div
                                    key={result.id}
                                    onClick={() => handleSearchResultClick(result.id)}
                                    className="px-4 py-3 hover:bg-slate-800/50 cursor-pointer border-b border-slate-800/50 last:border-0 flex items-center justify-between group"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-slate-200 group-hover:text-white">{result.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {result.unit_type}
                                            {result.leaders && result.leaders.length > 0 && ` • ${result.leaders[0].name}`}
                                        </p>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-600 group-hover:text-indigo-400" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Details Panel */}
            {selectedNodeData && (
                <div className="absolute right-0 top-0 bottom-0 z-50 pointer-events-none flex flex-col justify-center pr-6">
                    <div className="pointer-events-auto h-auto">
                        <NodeDetailsPanel
                            node={selectedNodeData}
                            onClose={() => setSelectedNodeId(null)}
                            onAddChild={handleAddChild}
                        />
                    </div>
                </div>
            )}

            {/* Add Unit Modal */}
            <Modal isOpen={isUnitModalOpen} onClose={() => setIsUnitModalOpen(false)} title={`Add Child to ${targetParent?.data?.label || 'Unit'}`}>
                <form onSubmit={handleSubmit(onSubmitUnit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Unit Name</label>
                        <input
                            {...register('name', { required: true })}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                            placeholder="e.g. North Zone, Cell Alpha..."
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Unit Type</label>
                        <select
                            {...register('unit_type')}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                        >
                            <option value="ZONAL">ZONAL</option>
                            <option value="MC">MC</option>
                            <option value="BUSCENTA">BUSCENTA</option>
                            <option value="CELL">CELL</option>
                        </select>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={() => setIsUnitModalOpen(false)}
                            className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors"
                        >
                            Create Unit
                        </button>
                    </div>
                </form>
            </Modal>

            <ReactFlow
                onInit={setRfInstance}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
                attributionPosition="bottom-right"
                minZoom={0.1}
                edgesFocusable={false}
                nodesDraggable={false}
            >
                <Controls className="bg-slate-800 text-slate-300 border-slate-700 !left-6 !bottom-6" />
                <MiniMap
                    nodeColor={(n) => {
                        if (n.data.unit_type === 'PERSON') return '#1e293b';
                        if (n.id === selectedNodeId) return '#6366f1';
                        return '#475569';
                    }}
                    maskColor="rgba(2, 6, 23, 0.8)"
                    className="!bg-slate-900 !border !border-slate-800 !rounded-lg !bottom-6 !right-6"
                />
                <Background color="#0f172a" gap={30} size={1} variant="dots" />
            </ReactFlow>
        </div>
    );
}
