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
                id,
                unit_id,
                position_id,
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

            // Smart status derivation:
            // - Pending: members whose names indicate they are pending identity (contains 'pending'), 
            //            or placeholders that are NOT system unit placeholders (ending in ' - Leader')
            // - Inactive: person.is_active is false
            // - Active: real, active member
            
            const isSystemUnitPlaceholder = person.is_placeholder && person.full_name.includes(' - Leader');
            const hasPendingName = person.full_name.toLowerCase().includes('pending');
            
            let status;
            if (hasPendingName || (person.is_placeholder && !isSystemUnitPlaceholder)) {
                status = 'Pending';
            } else if (!person.is_active && !isSystemUnitPlaceholder) {
                status = 'Inactive';
            } else if (isSystemUnitPlaceholder) {
                // System unit placeholders shouldn't really be in the directory, but if they are, keep them out of Pending
                status = 'System'; 
            } else {
                status = 'Active';
            }

            return {
                id: person.id,
                name: person.full_name,
                photo: person.photo_url,
                role: primaryAssignment?.position?.title || 'Unassigned',
                unit: primaryAssignment?.unit?.name || 'Unassigned',
                unit_id: primaryAssignment?.unit_id,
                position_id: primaryAssignment?.position_id,
                assignment_id: primaryAssignment?.id,
                unit_type: primaryAssignment?.unit?.unit_type,
                status,
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
            is_placeholder: false
        }])
        .select()
        .single();

    if (error) throw error;

    // Invalidate People + Hierarchy caches (dashboard counts change)
    cacheService.remove(CACHE_KEYS.PEOPLE);
    cacheService.remove(CACHE_KEYS.HIERARCHY);

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
            // OI-3: Log clearly — person exists but has no placement. Surface this.
            console.error("Person created but assignment failed:", assignError);
            throw new Error(`Member was added but could not be placed in the selected unit. Please edit the member to assign them manually. (Details: ${assignError.message})`);
        }
    }

    return person;
};

export const updatePerson = async (id, updates) => {
    // 1. Update Core Bio
    const { data: person, error: personError } = await supabase
        .from('people')
        .update({
            full_name: updates.fullName,
            is_active: updates.is_active
        })
        .eq('id', id)
        .select()
        .single();

    if (personError) throw personError;

    // 2. Handle Assignment Update (Transfer)
    if (updates.unitId && updates.positionId) {
        // Deactivate old assignments
        await supabase
            .from('position_assignments')
            .update({ is_active: false })
            .eq('person_id', id);

        // Create new one
        const { error: assignError } = await supabase
            .from('position_assignments')
            .insert([{
                person_id: id,
                unit_id: updates.unitId,
                position_id: updates.positionId,
                is_active: true,
                is_primary: true
            }]);

        if (assignError) throw assignError;
    }

    // Invalidate People + Hierarchy caches
    cacheService.remove(CACHE_KEYS.PEOPLE);
    cacheService.remove(CACHE_KEYS.HIERARCHY);

    return person;
};

export const deactivatePerson = async (id) => {
    const { error } = await supabase
        .from('people')
        .update({ is_active: false })
        .eq('id', id);

    if (error) throw error;
    cacheService.remove(CACHE_KEYS.PEOPLE);
    cacheService.remove(CACHE_KEYS.HIERARCHY);
    return true;
};

export const reactivatePerson = async (id) => {
    const { error } = await supabase
        .from('people')
        .update({ is_active: true })
        .eq('id', id);

    if (error) throw error;
    cacheService.remove(CACHE_KEYS.PEOPLE);
    cacheService.remove(CACHE_KEYS.HIERARCHY);
    return true;
};

// Hard delete - reserved for admin cleanup only (not exposed in UI)
export const hardDeletePerson = async (id) => {
    const { error } = await supabase
        .from('people')
        .delete()
        .eq('id', id);

    if (error) throw error;
    cacheService.remove(CACHE_KEYS.PEOPLE);
    return true;
};
