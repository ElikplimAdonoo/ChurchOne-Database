import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { ChevronRight, ChevronLeft } from 'lucide-react';

const CollapsibleNode = memo(({ data, isConnectable, style }) => {
    // data.isCollapsed, data.hasChildren, data.onToggle
    // Using node styles passed from parent

    const activeLeaderCount = data.leaders?.length || 0;

    return (
        <div style={style} className="relative group min-h-[60px] flex flex-col justify-center">
            {/* Input Handle (Left) */}
            <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="opacity-0" />

            <div className="flex flex-col items-center justify-center min-h-[40px]">
                <span className="font-semibold text-sm">{data.label}</span>
                {data.leaders && data.leaders.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-white/10 w-full justify-center">
                        {/* Optional: Add small avatar if photo_url exists */}
                        <span className="text-xs text-indigo-200 font-medium truncate max-w-[150px]">
                            {data.leaders[0].name}
                        </span>
                        {activeLeaderCount > 1 && (
                            <span className="text-[10px] bg-slate-700 px-1.5 rounded-full text-slate-300">
                                +{activeLeaderCount - 1}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Output Handle (Right) */}
            <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="opacity-0" />

            {/* Expand/Collapse Button */}
            {data.hasChildren && (
                <div
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-700 border border-slate-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-600 hover:border-white transition-all z-50 text-white shadow-md"
                    onClick={(e) => {
                        e.stopPropagation();
                        data.onToggle(data.id);
                    }}
                >
                    <ChevronRight
                        size={14}
                        className={`transition-transform duration-200 ${!data.isCollapsed ? 'rotate-90' : ''}`}
                    />
                </div>
            )}
        </div>
    );
});

export default CollapsibleNode;
