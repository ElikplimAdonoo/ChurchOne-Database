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
import ImageModal from './common/ImageModal';

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
        const unit = dataMap.get(parentId);
        const unitKids = childrenMap.get(parentId) || [];
        
        // Convert unit members to person nodes if the unit is not collapsed
        const memberKids = (!collapsedIds.has(parentId) && unit?.members) 
            ? unit.members.map(m => ({
                id: `person-${m.id}`,
                name: m.name,
                unit_type: 'PERSON',
                photo: m.photo,
                role: m.role,
                is_person_node: true
            })) 
            : [];

        const children = collapsedIds.has(parentId) 
            ? [] 
            : [
                ...unitKids.map(k => buildHierarchy(k.id)),
                ...memberKids
            ];

        const result = {
            id: parentId,
            ...unit,
            children
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
                hasChildren: (childrenMap.get(d.data.id)?.length > 0 || (d.data.members?.length > 0)),
                isCollapsed: collapsedIds.has(d.data.id),
                leaders: d.data.leaders,
                photo: d.data.photo, // For PERSON nodes
                role: d.data.role,   // For PERSON nodes
                id: d.data.id
            },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            style: getStyle(d.data.unit_type, false, d.data.role)
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

const baseStyle = {
    background: '#1a1a1a',
    color: '#e2e8f0',
    borderTopWidth: '2px',
    borderRightWidth: '2px',
    borderBottomWidth: '2px',
    borderLeftWidth: '2px',
    borderStyle: 'solid',
    borderTopColor: '#0066FF',
    borderRightColor: '#0066FF',
    borderBottomColor: '#0066FF',
    borderLeftColor: '#0066FF',
    borderRadius: '16px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '700',
    width: 'auto',
    minWidth: '180px',
    textAlign: 'center',
    boxShadow: '0 4px 12px -2px rgba(0, 102, 255, 0.25)',
    transition: 'all 0.3s ease'
};

const getStyle = (type, isSelected, role) => {
    let style = { ...baseStyle };
    if (isSelected) {
        style.boxShadow = '0 0 0 3px rgba(0, 102, 255, 0.6), 0 8px 16px -4px rgba(0, 0, 0, 0.5)';
        style.borderTopColor = '#3385FF';
        style.borderRightColor = '#3385FF';
        style.borderBottomColor = '#3385FF';
        style.borderLeftColor = '#3385FF';
        style.transform = 'scale(1.03)';
        style.zIndex = 100;
    }

    // Unique style for Cell Shepherds
    const isCellShepherd = role?.toLowerCase() === 'cell shepherd';

    switch (type) {
        case 'ZONAL': return { 
            ...style, 
            borderLeftColor: '#0066FF', 
            borderLeftWidth: '4px', 
            background: isSelected ? '#172554' : '#0a0a0a' 
        };
        case 'MC': return { 
            ...style, 
            borderLeftColor: '#3385FF', 
            borderLeftWidth: '4px', 
            background: isSelected ? '#1e3a8a' : '#111111' 
        };
        case 'BUSCENTA': return { 
            ...style, 
            borderLeftColor: '#66A3FF', 
            borderLeftWidth: '4px', 
            background: isSelected ? '#1e40af' : '#1a1a1a' 
        };
        case 'CELL': return { 
            ...style, 
            borderLeftColor: '#99C2FF', 
            borderLeftWidth: '4px', 
            background: isSelected ? '#2563eb' : '#222222' 
        };
        case 'PERSON': {
            const personBorderColor = isSelected 
                ? (isCellShepherd ? '#EAB308' : '#3385FF') 
                : (isCellShepherd ? '#EAB308' : '#333');
            
            const personBorderLeftColor = isCellShepherd 
                ? '#EAB308' 
                : (isSelected ? '#0066FF' : '#444');

            return {
                ...style,
                background: isCellShepherd ? (isSelected ? '#422006' : '#1c1917') : (isSelected ? '#1e293b' : '#0f0f0f'),
                borderTopColor: personBorderColor,
                borderRightColor: personBorderColor,
                borderBottomColor: personBorderColor,
                borderLeftColor: personBorderLeftColor,
                borderTopWidth: '2px',
                borderRightWidth: '2px',
                borderBottomWidth: '2px',
                borderLeftWidth: '4px',
                color: isCellShepherd ? '#FDE047' : '#94a3b8',
                minWidth: '150px',
                fontSize: '12px'
            };
        }
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
    const [modalConfig, setModalConfig] = useState({ isOpen: false, src: '', title: '' });

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
        const results = [];
        
        flatData.forEach(d => {
            // Check unit name/leaders
            if (d.name.toLowerCase().includes(q) || (d.leaders && d.leaders.some(l => l.name.toLowerCase().includes(q)))) {
                results.push({ id: d.id, name: d.name, type: d.unit_type });
            }
            // Check members
            if (d.members) {
                const matchingMembers = d.members.filter(m => m.name.toLowerCase().includes(q));
                matchingMembers.forEach(m => {
                    results.push({ id: `person-${m.id}`, name: m.name, type: 'PERSON', unitName: d.name });
                });
            }
        });

        setSearchResults(results.slice(0, 10));
    }, [searchQuery, flatData]);

    const handleSearchResultClick = (result) => {
        // If it's a person node, we need to ensure their parent unit is expanded 
        // before we can focus on them. This is tricky with the current collapsible logic.
        // For now, let's at least find the node if it exists.
        
        const node = nodes.find(n => n.id === result.id);
        if (node && rfInstance) {
            setSelectedNodeId(result.id);
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
                leaders: unit.leaders || [],
                members: unit.members || []
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
                onImageClick: (src, title) => setModalConfig({ isOpen: true, src, title }),
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
        <div className="h-full w-full bg-gradient-dark relative overflow-hidden">
            {/* Decorative Dot Pattern */}
            <div className="absolute inset-0 bg-dot-pattern bg-dot-md text-church-blue-500 opacity-10 pointer-events-none z-0"></div>

            {/* Search Overlay */}
            <div className="absolute top-6 left-6 z-50 w-80">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-church-blue-400 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search map..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-church-blue-500/50 focus:ring-2 focus:ring-church-blue-500/50 shadow-lg text-slate-200 font-medium"
                    />

                    {/* Search Results Dropdown */}
                    {searchQuery && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur border border-slate-700/50 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                            {searchResults.map(result => (
                                <div
                                    key={result.id}
                                    onClick={() => handleSearchResultClick(result)}
                                    className="px-4 py-3 hover:bg-slate-800/50 cursor-pointer border-b border-slate-800/50 last:border-0 flex items-center justify-between group"
                                >
                                    <div>
                                        <p className="text-sm font-bold text-slate-200 group-hover:text-white">{result.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {result.type}
                                            {result.unitName && ` • ${result.unitName}`}
                                        </p>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-600 group-hover:text-church-blue-400" />
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
                        <label className="block text-sm font-black text-slate-300 mb-1">Unit Name</label>
                        <input
                            {...register('name', { required: true })}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-church-blue-500 focus:ring-2 focus:ring-church-blue-500/50 font-medium"
                            placeholder="e.g. North Zone, Cell Alpha..."
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-black text-slate-300 mb-1">Unit Type</label>
                        <select
                            {...register('unit_type')}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-church-blue-500 focus:ring-2 focus:ring-church-blue-500/50 font-medium"
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
                            className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors font-bold border border-slate-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2 rounded-lg bg-gradient-church text-white font-black hover:opacity-90 transition-all border border-church-blue-600"
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
                <Controls className="!bg-black/80 !text-gray-300 !border !border-gray-700 !rounded-xl !left-6 !bottom-6" />
                <MiniMap
                    nodeColor={(n) => {
                        if (n.data.unit_type === 'PERSON') return '#1a1a1a';
                        if (n.id === selectedNodeId) return '#3385FF';
                        return '#0066FF';
                    }}
                    maskColor="rgba(0, 0, 0, 0.85)"
                    className="!bg-black/80 !border !border-gray-700 !rounded-xl !bottom-6 !right-6"
                />
                <Background color="#1a1a1a" gap={30} size={1} variant="dots" />
            </ReactFlow>

            <ImageModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                imageSrc={modalConfig.src}
                title={modalConfig.title}
            />
        </div>
    );
}
