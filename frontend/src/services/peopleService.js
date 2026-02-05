import { supabase } from '../lib/supabase';
import { cacheService, CACHE_KEYS } from './cacheService';

export async function fetchPeople() {
    // Check Cache
    const cached = cacheService.get(CACHE_KEYS.PEOPLE);
    if (cached) return cached;

    // We want: Name, Role, Unit Name, Unit Type, Status
    const { data, error } = await supabase
        .from('people')
        .select(`
            id,
            full_name,
            photo_url,
            is_active,
            is_placeholder,
            assignments:position_assignments(
                is_active,
                position:positions(title, unit_type),
                unit:organizational_units(name, unit_type)
            )
        `)
        .order('full_name');

    if (error) throw error;

    // Flatten logic
    const result = data.map(person => {
        // Get primary active assignment
        const primaryAssignment = person.assignments?.find(a => a.is_active);

        return {
            id: person.id,
            name: person.full_name,
            photo: person.photo_url,
            role: primaryAssignment?.position?.title || 'Unassigned',
            unit: primaryAssignment?.unit?.name || 'Unassigned',
            unit_type: primaryAssignment?.unit?.unit_type,
            status: person.is_active ? 'Active' : 'Inactive',
            is_placeholder: person.is_placeholder
        };
    });

    cacheService.set(CACHE_KEYS.PEOPLE, result);
    return result;
}

// --- MUTATIONS ---
export const createPerson = async (personData) => {
    // 1. Create Person
    const { data: person, error } = await supabase
        .from('people')
        .insert([{
            full_name: personData.fullName,
            email: personData.email,
            phone: personData.phone,
            is_placeholder: false
        }])
        .select()
        .single();

    if (error) throw error;



    // Invalidate Cache
    cacheService.remove(CACHE_KEYS.PEOPLE);

    // 2. Create Assignment (if unit/position provided)
    if (personData.unitId && personData.positionId) {
        const { error: assignError } = await supabase
            .from('position_assignments')
            .insert([{
                person_id: person.id,
                unit_id: personData.unitId,
                position_id: personData.positionId,
                is_active: true,
                is_primary: true
            }]);

        if (assignError) {
            console.error("Failed to assign person:", assignError);
            // Optional: delete person to rollback? Or just throw.
            // For now, let's just log it.
        }
    }

    return person;
};

export const updatePerson = async (id, updates) => {
    // updates: { full_name, email, phone, is_active, ... }
    const { data, error } = await supabase
        .from('people')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    // Invalidate Cache
    cacheService.remove(CACHE_KEYS.PEOPLE);

    return data;
};

export const deletePerson = async (id) => {
    const { error } = await supabase
        .from('people')
        .delete()
        .eq('id', id);

    if (error) throw error;
    // Invalidate Cache
    cacheService.remove(CACHE_KEYS.PEOPLE);
    return true;
};
