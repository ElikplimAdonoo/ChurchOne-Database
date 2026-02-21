import { useForm } from 'react-hook-form';
import { Plus, Layout, Info } from 'lucide-react';
import Modal from './ui/Modal';

export default function AddUnitModal({ isOpen, onClose, parentNode, onSubmit }) {
    const { register, handleSubmit, reset, formState: { errors } } = useForm();

    if (!parentNode) return null;

    const parentType = parentNode.data.unit_type;
    const parentName = parentNode.data.label;

    // Determine target child type
    let childType = 'CELL';
    let childLabel = 'Cell';
    
    if (parentType === 'ROOT') { childType = 'ZONE'; childLabel = 'Zone'; }
    else if (parentType === 'ZONE') { childType = 'MC'; childLabel = 'Ministry Center (MC)'; }
    else if (parentType === 'MC') { childType = 'BUSCENTA'; childLabel = 'Buscenta'; }
    else if (parentType === 'BUSCENTA') { childType = 'CELL'; childLabel = 'Cell'; }

    const handleInternalSubmit = (data) => {
        onSubmit({
            ...data,
            unit_type: childType,
            parent_id: parentNode.id
        });
        reset();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Create New ${childLabel}`}>
            <form onSubmit={handleSubmit(handleInternalSubmit)} className="space-y-5">
                {/* Context Tip */}
                <div className="flex gap-3 p-4 rounded-xl bg-church-blue-500/10 border border-church-blue-500/20">
                    <Info className="text-church-blue-400 shrink-0" size={18} />
                    <p className="text-xs text-slate-400 leading-relaxed">
                        You are adding a new <span className="text-church-blue-400 font-bold">{childLabel}</span> under 
                        <span className="text-white font-bold ml-1">{parentName}</span>.
                    </p>
                </div>

                <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                        {childLabel} Name
                    </label>
                    <div className="relative group">
                        <Layout className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-church-blue-400 transition-colors" size={18} />
                        <input
                            {...register('name', { required: 'Unit name is required' })}
                            className="w-full bg-slate-900 border border-slate-700/50 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-church-blue-500/50 focus:ring-2 focus:ring-church-blue-500/50 transition-all text-slate-200 font-medium placeholder:text-slate-600"
                            placeholder={`e.g. ${childLabel} Alpha...`}
                            autoFocus
                        />
                    </div>
                    {errors.name && <span className="text-church-coral-400 text-[10px] font-bold uppercase ml-1">{errors.name.message}</span>}
                </div>

                <div className="pt-2 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all font-bold border border-slate-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="flex-1 py-3 rounded-xl bg-gradient-church text-white font-black hover:opacity-90 transition-all shadow-lg border-2 border-church-blue-600 active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Plus size={18} />
                        Create Unit
                    </button>
                </div>
            </form>
        </Modal>
    );
}
