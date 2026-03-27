import { tree, hierarchy } from 'd3-hierarchy';
import { Position } from 'reactflow';

export const baseStyle = {
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

export const getStyle = (type, isSelected, role) => {
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

    const isCellShepherd = role?.toLowerCase() === 'cell shepherd';

    switch (type) {
        case 'ZONAL': return { 
            ...style, 
            borderLeftColor: '#030253ff', 
            borderLeftWidth: '4px', 
            background: isSelected ? '#030253ff' : '#0a0a0a' 
        };
        case 'MC': return { 
            ...style, 
            borderLeftColor: '#060488ff', 
            borderLeftWidth: '4px', 
            background: isSelected ? '#060488ff' : '#111111' 
        };
        case 'BUSCENTA': return { 
            ...style, 
            borderLeftColor: '#0705b1ff', 
            borderLeftWidth: '4px', 
            background: isSelected ? '#0705b1ff' : '#1a1a1a' 
        };
        case 'CELL': return { 
            ...style, 
            borderLeftColor: '#0804faff', 
            borderLeftWidth: '4px', 
            background: isSelected ? '#0804faff' : '#222222' 
        };
        case 'PERSON': return {
            ...style,
            background: isSelected ? '#1e293b' : '#111827',
            borderLeftWidth: '4px',
            borderLeftColor: '#3b82f6',
            color: '#e2e8f0',
        };
        default: return style;
    }
};

export const layoutTree = (flatData, collapsedIds, userRole = null) => {
    if (!flatData || flatData.length === 0) return { nodes: [], edges: [] };

    const dataMap = new Map(flatData.map(d => [d.id, { ...d }]));
    const roots = flatData.filter(d => !d.parent_id || !dataMap.has(d.parent_id));

    const childrenMap = new Map();
    flatData.forEach(d => {
        if (d.parent_id) {
            if (!childrenMap.has(d.parent_id)) childrenMap.set(d.parent_id, []);
            childrenMap.get(d.parent_id).push(d);
        }
    });

    const nodes = [];
    const edges = [];

    const buildHierarchy = (parentId) => {
        const unit = dataMap.get(parentId);
        const unitKids = childrenMap.get(parentId) || [];
        
        const children = collapsedIds.has(parentId) 
            ? [] 
            : unitKids.map(k => buildHierarchy(k.id));

        const result = {
            id: parentId,
            ...unit,
            children
        };
        
        if (result.children.length === 0) delete result.children;
        return result;
    }

    if (roots.length === 0) return { nodes: [], edges: [] };
    
    let hierarchyData;
    if (roots.length === 1) {
        hierarchyData = buildHierarchy(roots[0].id);
    } else {
        hierarchyData = {
            id: 'synthetic-root',
            name: userRole ? `${userRole.unitName || 'My'} Jurisdiction` : 'Global Church Structure',
            unit_type: 'ROOT',
            children: roots.map(r => buildHierarchy(r.id))
        };
        dataMap.set('synthetic-root', { id: 'synthetic-root', name: hierarchyData.name, unit_type: 'ROOT' });
    }

    const root = hierarchy(hierarchyData);

    const treeLayout = tree()
        .nodeSize([80, 280])
        .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));

    treeLayout(root);

    root.descendants().forEach(d => {
        nodes.push({
            id: d.data.id,
            type: 'mindMapNode',
            position: { x: d.y, y: d.x }, 
            data: {
                label: d.data.name,
                unit_type: d.data.unit_type,
                hasChildren: (childrenMap.get(d.data.id)?.length > 0 || (d.data.members?.length > 0 || d.data.leaders?.length > 0)),
                isCollapsed: collapsedIds.has(d.data.id),
                leaders: d.data.leaders,
                members: d.data.members,
                photo: d.data.photo, 
                role: d.data.role,   
                id: d.data.id,
                isOwnJurisdiction: userRole && d.data.id === userRole.unitId
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
                type: 'default',
                style: { stroke: '#475569', strokeWidth: 2 },
                animated: false
            });
        }
    });

    return { nodes, edges };
};
