import { X, User, Users, MapPin, ChevronRight, Activity, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NodeDetailsPanel({ node, onClose, onAddChild }) {
    if (!node) return null;

    const { label, unit_type, role } = node.data;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute top-4 right-4 bottom-4 w-96 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-700/50 flex items-start justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge type={unit_type} />
                            {node.data.isCollapsed && <span className="text-xs text-slate-400">(Collapsed)</span>}
                        </div>
                        <h2 className="text-2xl font-bold text-white leading-tight">{label}</h2>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors relative z-10"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Stats / Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <InfoCard label="Status" value="Active" icon={<Activity size={16} />} color="emerald" />
                        <InfoCard label="ID" value={node.id.substring(0, 8)} icon={<MapPin size={16} />} color="blue" />
                    </div>

                    {/* Leaders Section */}
                    {node.data.leaders && node.data.leaders.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Assigned Leaders</h3>
                            <div className="space-y-2">
                                {node.data.leaders.map((leader, i) => (
                                    <div key={i} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold border border-indigo-500/30 shrink-0">
                                            {(leader.name || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{leader.name}</p>
                                            <p className="text-xs text-slate-400">{leader.role || 'Leader'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Hierarchy Context */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Hierarchy Context</h3>
                        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-3">
                            <div className="flex items-center gap-3 text-sm text-slate-300">
                                <div className="p-2 rounded-full bg-slate-700">
                                    <ChevronRight size={14} className="text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Parent Unit</p>
                                    <p className="font-medium">
                                        {node.parentId ? `Unit ${node.parentId.substring(0, 8)}...` : 'Root'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions (Mock) */}
                    <div className="space-y-3">
                        <button
                            onClick={() => onAddChild(node)}
                            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                        >
                            <Plus size={18} />
                            Add Child Unit
                        </button>
                        <button className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20">
                            <User size={18} />
                            View Unit details
                        </button>
                        <button className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 border border-slate-700">
                            <Users size={18} />
                            Manage Members
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

function Badge({ type }) {
    const colors = {
        ZONAL: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        MC: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        BUSCENTA: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        CELL: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        PERSON: 'bg-slate-700 text-slate-300 border-slate-600',
    };

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${colors[type] || colors.PERSON}`}>
            {type}
        </span>
    );
}

function InfoCard({ label, value, icon, color }) {
    const colors = {
        emerald: 'text-emerald-400 bg-emerald-500/10',
        blue: 'text-blue-400 bg-blue-500/10',
    };

    return (
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-1">
                <div className={`p-1 rounded ${colors[color]}`}>
                    {icon}
                </div>
                <span className="text-xs text-slate-500 font-medium">{label}</span>
            </div>
            <p className="text-sm font-semibold text-slate-200">{value}</p>
        </div>
    );
}
