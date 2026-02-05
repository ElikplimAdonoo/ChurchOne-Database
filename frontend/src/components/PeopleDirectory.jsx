import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { fetchPeople, createPerson, updatePerson, deletePerson } from '../services/peopleService';
import { fetchHierarchyData, fetchPositions } from '../services/hierarchyService';
import { Search, Filter, ArrowUpDown, MoreHorizontal, User, Plus, Edit, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Modal from './ui/Modal';
import ImageModal from './common/ImageModal';

export default function PeopleDirectory() {
    const [people, setPeople] = useState([]);
    const [units, setUnits] = useState([]);
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('All');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
    const [editingPerson, setEditingPerson] = useState(null);
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
        setEditingPerson(null);
        reset({ fullName: '', email: '', phone: '', unitId: '', positionId: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (person) => {
        setModalMode('edit');
        setEditingPerson(person);
        // Populating existing unit/role is hard because we only have their names in flat 'person' object.
        // We'd need to find the unit ID by name, position by title... fragile.
        // For now, let's keep Edit simple (Name/Email/Phone only).
        setValue('fullName', person.name);
        setIsModalOpen(true);
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

    const onSubmit = async (data) => {
        try {
            if (modalMode === 'add') {
                const newPerson = await createPerson({
                    fullName: data.fullName,
                    email: data.email,
                    phone: data.phone,
                    unitId: data.unitId,
                    positionId: data.positionId
                });

                // We need to re-fetch people to get the correct joined unit/role names
                // Or we can cheat and look them up from our units/positions lists
                const unitName = units.find(u => u.id === data.unitId)?.name || 'Unassigned';
                const roleName = positions.find(p => p.id === data.positionId)?.title || 'Unassigned';

                setPeople(prev => [...prev, {
                    id: newPerson.id,
                    name: newPerson.full_name,
                    role: roleName,
                    unit: unitName,
                    status: 'Active',
                    is_placeholder: false
                }]);
            } else {
                await updatePerson(editingPerson.id, { full_name: data.fullName });
                setPeople(prev => prev.map(p => p.id === editingPerson.id ? { ...p, name: data.fullName } : p));
            }
            setIsModalOpen(false);
            reset();
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

            {/* Table */}
            <div className="bg-slate-800/50 rounded-2xl border-2 border-church-blue-500/50 overflow-hidden shadow-lg backdrop-blur-sm">
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-900/50 text-church-blue-400 uppercase tracking-wider font-black">
                            <tr>
                                <th onClick={() => handleSort('name')} className="p-4 cursor-pointer hover:text-church-blue-300 transition-colors">
                                    <div className="flex items-center gap-2">
                                        Name
                                        {sortConfig.key === 'name' ? (
                                            <ArrowUpDown size={14} className={sortConfig.direction === 'asc' ? 'text-church-blue-400' : 'text-church-blue-400 rotate-180'} />
                                        ) : (
                                            <ArrowUpDown size={14} className="text-slate-600" />
                                        )}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('role')} className="p-4 cursor-pointer hover:text-emerald-400 transition-colors">
                                    <div className="flex items-center gap-2">
                                        Role
                                        {sortConfig.key === 'role' ? (
                                            <ArrowUpDown size={14} className={sortConfig.direction === 'asc' ? 'text-emerald-400' : 'text-emerald-400 rotate-180'} />
                                        ) : (
                                            <ArrowUpDown size={14} className="text-slate-600" />
                                        )}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('unit')} className="p-4 cursor-pointer hover:text-emerald-400 transition-colors">
                                    <div className="flex items-center gap-2">
                                        Unit
                                        {sortConfig.key === 'unit' ? (
                                            <ArrowUpDown size={14} className={sortConfig.direction === 'asc' ? 'text-emerald-400' : 'text-emerald-400 rotate-180'} />
                                        ) : (
                                            <ArrowUpDown size={14} className="text-slate-600" />
                                        )}
                                    </div>
                                </th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {filteredPeople.map((person) => (
                                <motion.tr
                                    key={person.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="hover:bg-slate-700/30 transition-colors group"
                                >
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div 
                                                onClick={() => person.photo && setImageModalConfig({ isOpen: true, src: person.photo, title: person.name })}
                                                className={`w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-600 transition-transform hover:scale-105 ${person.photo ? 'cursor-pointer' : ''}`}
                                            >
                                                {person.photo ? (
                                                    <img src={person.photo} alt={person.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={20} className="text-slate-400" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-100">{person.name}</div>
                                                {person.is_placeholder && (
                                                    <div className="text-[10px] text-yellow-400/80 font-semibold">Pending Identity</div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-300 font-medium">{person.role}</td>
                                    <td className="p-4 text-slate-300 font-medium">{person.unit}</td>
                                    <td className="p-4 text-center">
                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold
                                            ${person.status === 'Active' ? 'bg-church-blue-500/20 text-church-blue-400 border border-church-blue-500/50 font-bold' : 'bg-church-coral-500/20 text-church-coral-400 border border-church-coral-500/50 font-bold'}
                                        `}>
                                            {person.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEditModal(person)}
                                                className="p-1.5 rounded-lg hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(person)}
                                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                                                title="Delete"
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

                {/* Mobile Card List */}
                <div className="md:hidden divide-y divide-slate-700/50">
                    {filteredPeople.map((person) => (
                        <div key={person.id} className="p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div 
                                        onClick={() => person.photo && setImageModalConfig({ isOpen: true, src: person.photo, title: person.name })}
                                        className={`w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-600 shadow-lg ${person.photo ? 'cursor-pointer' : ''}`}
                                    >
                                        {person.photo ? (
                                            <img src={person.photo} alt={person.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={24} className="text-slate-400" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-100 text-lg">{person.name}</div>
                                        <div className="text-slate-400 text-sm font-medium">{person.role}</div>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                                    ${person.status === 'Active' ? 'bg-church-blue-500/20 text-church-blue-400 border border-church-blue-500/50' : 'bg-church-coral-500/20 text-church-coral-400 border border-church-coral-500/50'}
                                `}>
                                    {person.status}
                                </span>
                            </div>
                            <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
                                <div className="text-xs text-slate-500 uppercase font-black tracking-widest">Unit: <span className="text-slate-200 ml-1">{person.unit}</span></div>
                                <div className="flex gap-2">
                                    <button onClick={() => openEditModal(person)} className="p-2 rounded-lg bg-blue-500/10 text-blue-400"><Edit size={16}/></button>
                                    <button onClick={() => handleDelete(person)} className="p-2 rounded-lg bg-red-500/10 text-red-400"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredPeople.length === 0 && (
                    <div className="p-12 text-center text-slate-500">
                        <User size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No people found matching your criteria.</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalMode === 'add' ? "Add New Member" : "Edit Member"}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-1">Full Name</label>
                        <input
                            {...register('fullName', { required: 'Name is required' })}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-church-blue-500 focus:ring-2 focus:ring-church-blue-500/50 font-medium"
                            placeholder="e.g. John Doe"
                        />
                        {errors.fullName && <span className="text-church-coral-400 text-xs font-semibold">{errors.fullName.message}</span>}
                    </div>

                    {modalMode === 'add' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-1">Unit</label>
                                    <select
                                        {...register('unitId')}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-church-blue-500 focus:ring-2 focus:ring-church-blue-500/50 font-medium"
                                    >
                                        <option value="">Select Unit...</option>
                                        {units.map(u => (
                                            <option key={u.id} value={u.id}>{u.name} ({u.unit_type})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-1">Role</label>
                                    <select
                                        {...register('positionId')}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-church-blue-500 focus:ring-2 focus:ring-church-blue-500/50 font-medium"
                                        disabled={!availablePositions.length}
                                    >
                                        <option value="">Select Role...</option>
                                        {availablePositions.map(p => (
                                            <option key={p.id} value={p.id}>{p.title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-1">Email <span className="text-slate-500">(Optional)</span></label>
                                <input
                                    {...register('email')}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-church-blue-500 focus:ring-2 focus:ring-church-blue-500/50 font-medium"
                                    placeholder="john@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-1">Phone <span className="text-slate-500">(Optional)</span></label>
                                <input
                                    {...register('phone')}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-church-blue-500 focus:ring-2 focus:ring-church-blue-500/50 font-medium"
                                    placeholder="+1 (555) 000-0000"
                                />
                            </div>
                        </>
                    )}

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors border border-slate-600 font-bold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-2 rounded-lg bg-gradient-church text-white font-black hover:opacity-90 transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : (modalMode === 'add' ? 'Add Member' : 'Save Changes')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirm Deletion"
                maxWidth="max-w-sm"
            >
                <div className="space-y-4">
                    <p className="text-slate-300">
                        Are you sure you want to remove <span className="text-white font-bold">{deletingPerson?.name}</span>?
                        This action cannot be undone.
                    </p>
                    <div className="flex gap-3 justify-end pt-2">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors text-sm border border-slate-600 font-bold"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="px-4 py-2 rounded-lg bg-church-coral-500 text-white font-black hover:bg-church-coral-600 transition-colors text-sm"
                        >
                            Delete Member
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

