import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { fetchPeople, createPerson, updatePerson, deletePerson } from '../services/peopleService';
import { fetchHierarchyData, fetchPositions } from '../services/hierarchyService';
import { Search, Filter, ArrowUpDown, MoreHorizontal, User, Plus, Edit, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import Modal from './ui/Modal';
import ImageModal from './common/ImageModal';
import PersonActionModal from './PersonActionModal';

export default function PeopleDirectory() {
    const [people, setPeople] = useState([]);
    const [units, setUnits] = useState([]);
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('All');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

    // Modal State
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingPerson, setDeletingPerson] = useState(null);
    const [imageModalConfig, setImageModalConfig] = useState({ isOpen: false, src: '', title: '' });
    
    const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm();

    // Watch selected unit to filter roles
    const selectedUnitId = watch('unitId');

    // Filter available positions based on selected unit
    const availablePositions = useMemo(() => {
        if (!selectedUnitId) return [];
        // Determine unit type. 'units' state contains hierarchy, but it might be nested if fetched raw?
        // Ah, fetchHierarchyData returns units with leaders. It's a flat array of units.
        const unit = units.find(u => u.id === selectedUnitId);
        if (!unit) return [];
        return positions.filter(p => p.unit_type === unit.unit_type);
    }, [selectedUnitId, units, positions]);

    useEffect(() => {
        Promise.all([
            fetchPeople(),
            fetchHierarchyData(),
            fetchPositions()
        ]).then(([peopleData, unitsData, positionsData]) => {
            setPeople(peopleData);
            setUnits(unitsData); // This is flat array of units
            setPositions(positionsData);
        }).finally(() => setLoading(false));
    }, []);

    // Unique Roles for Filter
    const roles = useMemo(() => {
        const unique = new Set(people.map(p => p.role));
        return ['All', ...Array.from(unique).sort()];
    }, [people]);

    // Filter & Sort
    const filteredPeople = useMemo(() => {
        let filtered = people.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.unit.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = filterRole === 'All' || p.role === filterRole;
            return matchesSearch && matchesRole;
        });


        return filtered.sort((a, b) => {
            const valA = (a[sortConfig.key] || '').toString().toLowerCase();
            const valB = (b[sortConfig.key] || '').toString().toLowerCase();

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [people, searchTerm, filterRole, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Handlers
    const openAddModal = () => {
        setModalMode('add');
        setSelectedPerson(null);
        reset({ fullName: '', unitId: '', positionId: '' });
        setIsActionModalOpen(true);
    };

    const openEditModal = (person) => {
        setModalMode('edit');
        setSelectedPerson(person);
        setIsActionModalOpen(true);
    };

    const handleDelete = (person) => {
        setDeletingPerson(person);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deletingPerson) return;
        try {
            await deletePerson(deletingPerson.id);
            setPeople(prev => prev.filter(p => p.id !== deletingPerson.id));
            setIsDeleteModalOpen(false);
            setDeletingPerson(null);
        } catch (err) {
            console.error("Failed to delete:", err);
            alert("Failed to delete member");
        }
    };

    const handleActionSubmit = async (data) => {
        try {
            if (modalMode === 'add') {
                const newPerson = await createPerson(data);
                setPeople(prev => [...prev, {
                    ...newPerson,
                    name: newPerson.full_name,
                    role: positions.find(p => p.id === data.positionId)?.title || 'Unassigned',
                    unit: units.find(u => u.id === data.unitId)?.name || 'Unassigned',
                    status: 'Active'
                }]);
            } else {
                const updated = await updatePerson(selectedPerson.id, data);
                setPeople(prev => prev.map(p => p.id === selectedPerson.id ? { 
                    ...p, 
                    name: updated.full_name,
                    role: positions.find(pos => pos.id === data.positionId)?.title || p.role,
                    unit: units.find(un => un.id === data.unitId)?.name || p.unit
                } : p));
            }
            setIsActionModalOpen(false);
        } catch (err) {
            console.error("Failed to save:", err);
            alert("Failed to save changes");
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-church-blue-500"></div>
        </div>
    );

    return (
        <div className="min-h-full bg-gradient-dark relative overflow-hidden">
            {/* Decorative Dot Pattern */}
            <div className="absolute inset-0 bg-dot-pattern bg-dot-md text-church-blue-500 opacity-5 pointer-events-none"></div>

            <div className="relative z-10 max-w-6xl mx-auto p-4 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/50 p-6 rounded-2xl border-2 border-church-blue-500/50 backdrop-blur-xl shadow-lg">
                <div>
                    <h2 className="text-3xl font-black bg-gradient-church bg-clip-text text-transparent">People Directory</h2>
                    <p className="text-slate-400 text-sm mt-1 font-semibold">{filteredPeople.length} Members Found</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative group flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-church-blue-400 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search names or units..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-church-blue-500/50 focus:ring-2 focus:ring-church-blue-500/50 transition-all text-slate-200 font-medium placeholder:text-slate-600 shadow-inner"
                        />
                    </div>
                </div>

                {/* Actions */}
                <button
                    onClick={openAddModal}
                    className="bg-gradient-church hover:opacity-90 text-white px-4 py-2.5 rounded-xl font-black flex items-center gap-2 transition-all shadow-lg active:scale-95 whitespace-nowrap border-2 border-church-blue-600"
                >
                    <Plus size={18} />
                    Add Member
                </button>
            </div>

            {/* Premium Table / Card List */}
            <div className="bg-slate-900/40 rounded-3xl border border-white/5 overflow-hidden shadow-2xl backdrop-blur-3xl">
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-950/50 text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black border-b border-white/5">
                            <tr>
                                <th onClick={() => handleSort('name')} className="p-6 cursor-pointer hover:text-church-blue-400 transition-colors">
                                    <div className="flex items-center gap-2">
                                        Member Identity
                                        {sortConfig.key === 'name' && (
                                            <ArrowUpDown size={12} className={sortConfig.direction === 'asc' ? 'text-church-blue-400' : 'text-church-blue-400 rotate-180'} />
                                        )}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('role')} className="p-6 cursor-pointer hover:text-emerald-400 transition-colors">
                                    <div className="flex items-center gap-2">
                                        Assignments
                                        {sortConfig.key === 'role' && (
                                            <ArrowUpDown size={12} className={sortConfig.direction === 'asc' ? 'text-emerald-400' : 'text-emerald-400 rotate-180'} />
                                        )}
                                    </div>
                                </th>
                                <th className="p-6 text-center">Status</th>
                                <th className="p-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {filteredPeople.map((person) => (
                                <motion.tr
                                    key={person.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="hover:bg-white/[0.02] transition-all group/row"
                                >
                                    <td className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div 
                                                onClick={() => person.photo && setImageModalConfig({ isOpen: true, src: person.photo, title: person.name })}
                                                className={`w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center overflow-hidden border border-white/5 transition-all group-hover/row:scale-105 group-hover/row:shadow-lg group-hover/row:border-church-blue-500/30 ${person.photo ? 'cursor-pointer' : ''}`}
                                            >
                                                {person.photo ? (
                                                    <img src={person.photo} alt={person.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={24} className="text-slate-600" />
                                                )}
                                            </div>
                                            <div className="space-y-0.5">
                                                <div className="font-black text-slate-100 text-base">{person.name}</div>
                                                {person.is_placeholder ? (
                                                    <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                                        <span className="w-1 h-1 bg-amber-500 rounded-full animate-pulse"></span> Virtual Placeholder
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-slate-500 font-medium">Verified Account</div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="space-y-1">
                                            <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-black uppercase inline-block">
                                                {person.role}
                                            </div>
                                            <div className="text-xs text-slate-400 font-bold flex items-center gap-1.5 ml-0.5">
                                                <MapPin size={12} className="text-slate-600" /> {person.unit}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6 text-center">
                                        <span className={`inline-flex px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest
                                            ${person.status === 'Active' ? 'bg-church-blue-500/10 text-church-blue-400 border border-church-blue-500/20' : 'bg-slate-800 text-slate-500 border border-white/5'}
                                        `}>
                                            {person.status}
                                        </span>
                                    </td>
                                    <td className="p-6 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-all transform translate-x-2 group-hover/row:translate-x-0">
                                            <button
                                                onClick={() => openEditModal(person)}
                                                className="p-2.5 rounded-xl bg-slate-800 hover:bg-church-blue-500/20 text-slate-400 hover:text-church-blue-400 transition-all border border-white/5 shadow-xl"
                                                title="Edit Profile"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(person)}
                                                className="p-2.5 rounded-xl bg-slate-800 hover:bg-church-coral-500/20 text-slate-400 hover:text-church-coral-400 transition-all border border-white/5 shadow-xl"
                                                title="Remove Member"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View: High-Fidelity Cards */}
                <div className="md:hidden grid grid-cols-1 gap-4 p-4">
                    {filteredPeople.map((person) => (
                        <div key={person.id} className="p-5 rounded-3xl bg-slate-900 border border-white/5 space-y-4 shadow-xl">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-white/5 flex items-center justify-center overflow-hidden">
                                        {person.photo ? <img src={person.photo} className="w-full h-full object-cover" /> : <User size={24} className="text-slate-600" />}
                                    </div>
                                    <div>
                                        <div className="font-black text-white text-lg">{person.name}</div>
                                        <div className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase inline-block border border-emerald-500/20">
                                            {person.role}
                                        </div>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${person.status === 'Active' ? 'bg-church-blue-500/10 text-church-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                                    {person.status}
                                </span>
                            </div>
                            
                            <div className="flex gap-3">
                                <button onClick={() => openEditModal(person)} className="flex-1 py-3 rounded-2xl bg-slate-800 text-slate-300 font-bold text-sm border border-white/5 flex items-center justify-center gap-2"><Edit size={16}/> Edit</button>
                                <button onClick={() => handleDelete(person)} className="flex-1 py-3 rounded-2xl bg-church-coral-500/10 text-church-coral-400 font-bold text-sm border border-church-coral-500/20 flex items-center justify-center gap-2"><Trash2 size={16}/> Remove</button>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredPeople.length === 0 && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }}
                        className="p-20 text-center space-y-4"
                    >
                        <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-white/5 shadow-2xl">
                             <User size={32} className="text-slate-700" />
                        </div>
                        <div>
                            <p className="text-slate-100 font-black text-xl">No members found</p>
                            <p className="text-slate-500 text-sm">Try adjusting your search or filters.</p>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Modals */}
            <PersonActionModal
                isOpen={isActionModalOpen}
                onClose={() => setIsActionModalOpen(false)}
                mode={modalMode}
                person={selectedPerson}
                units={units}
                positions={positions}
                onSubmit={handleActionSubmit}
            />

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="De-register Member"
                maxWidth="max-w-sm"
            >
                <div className="space-y-6">
                    <div className="w-16 h-16 bg-church-coral-500/10 rounded-2xl flex items-center justify-center mx-auto border border-church-coral-500/20">
                         <Trash2 size={24} className="text-church-coral-400" />
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-slate-100 font-black text-lg">Are you sure?</p>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            You are about to remove <span className="text-white font-bold">{deletingPerson?.name}</span> from the system. This action cannot be reversed.
                        </p>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all font-bold"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="flex-1 py-3 rounded-xl bg-church-coral-500 text-white font-black hover:bg-church-coral-600 transition-all shadow-lg shadow-church-coral-500/20 active:scale-95"
                        >
                            Confirm Deletion
                        </button>
                    </div>
                </div>
            </Modal>

            <ImageModal
                isOpen={imageModalConfig.isOpen}
                onClose={() => setImageModalConfig(prev => ({ ...prev, isOpen: false }))}
                imageSrc={imageModalConfig.src}
                title={imageModalConfig.title}
            />
        </div>
    </div>
  );
}

