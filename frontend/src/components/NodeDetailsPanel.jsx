import { X, User, Users, MapPin, ChevronRight, Activity, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import ImageModal from './common/ImageModal';

export default function NodeDetailsPanel({ node, onClose, onAddChild }) {
    const [modalConfig, setModalConfig] = useState({ isOpen: false, src: '', title: '' });

    if (!node) return null;

    const { label, unit_type } = node.data;

    const openImage = (e, src, title) => {
        e.stopPropagation();
        setModalConfig({ isOpen: true, src, title });
    };

    return (
        <>
            <AnimatePresence>
                <motion.div
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="absolute top-4 right-4 bottom-4 w-96 bg-slate-900/95 backdrop-blur-xl border-2 border-church-blue-500/50 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-700/50 flex items-start justify-between relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-church-blue-500/10 to-church-purple-500/10 pointer-events-none" />

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
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {/* Leaders & Members Section */}
                        <div className="space-y-8">
                            {/* Primary Oversight (Cell Shepherds) */}
                            {node.data.leaders && node.data.leaders.some(l => l.role.toLowerCase() === 'cell shepherd') && (
                                <div className="space-y-3">
                                    <div className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em] px-1 opacity-80">Primary Oversight</div>
                                    {node.data.leaders
                                        .filter(l => l.role.toLowerCase() === 'cell shepherd')
                                        .map((leader, i) => (
                                            <div key={`cell-${i}`} className="p-4 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-slate-800 border-2 border-yellow-500/50 flex items-center gap-4 shadow-lg shadow-yellow-500/10 transition-all">
                                                <div
                                                    onClick={(e) => leader.photo && openImage(e, leader.photo, leader.name)}
                                                    className="w-14 h-14 rounded-full border-2 border-yellow-400 overflow-hidden bg-slate-800 flex items-center justify-center shrink-0 cursor-pointer shadow-glow-yellow"
                                                >
                                                    {leader.photo ? (
                                                        <img src={leader.photo} alt={leader.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User size={24} className="text-yellow-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-black text-lg text-white leading-tight">{leader.name}</p>
                                                    <p className="text-xs font-bold uppercase tracking-wider text-yellow-300">{leader.role}</p>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}

                            {/* Service Team (Other Shepherds) */}
                            {node.data.leaders && node.data.leaders.some(l => l.role.toLowerCase() !== 'cell shepherd' && l.role.toLowerCase().includes('shepherd')) && (
                                <div className="space-y-3">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1 opacity-80">Service Team</div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {node.data.leaders
                                            .filter(l => l.role.toLowerCase() !== 'cell shepherd' && l.role.toLowerCase().includes('shepherd'))
                                            .map((leader, i) => (
                                                <div key={`shep-${i}`} className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center gap-3 hover:bg-slate-800/60 transition-colors">
                                                    <div
                                                        onClick={(e) => leader.photo && openImage(e, leader.photo, leader.name)}
                                                        className="w-10 h-10 rounded-full border border-slate-600 overflow-hidden bg-slate-800 flex items-center justify-center shrink-0 cursor-pointer"
                                                    >
                                                        {leader.photo ? (
                                                            <img src={leader.photo} alt={leader.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User size={18} className="text-slate-500" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-200 text-sm leading-tight">{leader.name}</p>
                                                        <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider font-mono">{leader.role}</p>
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}

                            {/* Unit Members */}
                            {node.data.members && node.data.members.length > 0 && (
                                <div className="space-y-3">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1 opacity-80">Unit Members</div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {node.data.members.map((member, i) => (
                                            <div key={`mem-${i}`} className="p-2.5 rounded-xl bg-slate-800/20 border border-white/5 flex items-center gap-3 hover:bg-slate-800/40 transition-colors group">
                                                <div
                                                    onClick={(e) => member.photo && openImage(e, member.photo, member.name)}
                                                    className={`w-8 h-8 rounded-full bg-slate-700 overflow-hidden border border-slate-600 flex items-center justify-center shrink-0 ${member.photo ? 'cursor-pointer' : ''}`}
                                                >
                                                    {member.photo ? (
                                                        <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User size={14} className="text-slate-500" />
                                                    )}
                                                </div>
                                                <p className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">{member.name}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="space-y-3 pt-4 border-t border-slate-800">
                            {unit_type !== 'PERSON' && (
                                <button
                                    onClick={() => onAddChild(node)}
                                    className="w-full py-3 px-4 bg-gradient-church hover:opacity-90 text-white rounded-xl font-black transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 border-2 border-church-blue-600"
                                >
                                    <Plus size={18} />
                                    Add Sub-Unit
                                </button>
                            )}
                            <button className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 border border-slate-700">
                                <Users size={18} />
                                Full Registry
                            </button>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            <ImageModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                imageSrc={modalConfig.src}
                title={modalConfig.title}
            />
        </>
    );
}

function Badge({ type }) {
    const colors = {
        ZONAL: 'bg-church-blue-500/20 text-church-blue-300 border-church-blue-500/30',
        MC: 'bg-church-blue-500/20 text-church-blue-300 border-church-blue-500/30',
        BUSCENTA: 'bg-church-magenta-500/20 text-church-magenta-300 border-church-magenta-500/30',
        CELL: 'bg-church-coral-500/20 text-church-coral-300 border-church-coral-500/30',
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
        blue: 'text-church-blue-400 bg-church-blue-500/10',
        purple: 'text-church-purple-400 bg-church-purple-500/10',
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

