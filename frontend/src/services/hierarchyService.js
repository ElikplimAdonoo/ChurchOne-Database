import { supabase } from '../lib/supabase';
import { cacheService, CACHE_KEYS } from './cacheService';

export const fetchHierarchyData = async () => {
    try {
        // Check Cache
        const cached = cacheService.get(CACHE_KEYS.HIERARCHY);
        if (cached) return cached;

        // 1. Fetch all organizational units (The Skeleton)
        const { data: units, error: unitsError } = await supabase
            .from('organizational_units')
            .select('id, parent_id, name, unit_type, order_index, is_placeholder')
            .order('order_index', { ascending: true }); // Respect the defined order

        if (unitsError) throw unitsError;

        // 2. Fetch all active assignments (The Flesh)
        const { data: assignments, error: assignError } = await supabase
            .from('position_assignments')
            .select(`
        unit_id,
        is_primary,
        people (full_name, photo_url, is_placeholder),
        positions (title, level)
      `)
            .eq('is_active', true);

        if (assignError) throw assignError;

        const unitsWithPeople = units.map(unit => {
            const unitAssignments = assignments.filter(a => a.unit_id === unit.id);

            // Sort assignments: Head/Shepherd first
            unitAssignments.sort((a, b) => a.positions.level - b.positions.level);

            return {
                ...unit,
                leaders: unitAssignments.map(a => ({
                    name: a.people.full_name,
                    role: a.positions.title,
                    photo: a.people.photo_url,
                    isPlaceholder: a.people.is_placeholder
                }))
            };
        });

        cacheService.set(CACHE_KEYS.HIERARCHY, unitsWithPeople);

        return unitsWithPeople;
    } catch (error) {
        console.error('Error fetching hierarchy:', error);
        throw error;
    }
};
// --- MUTATIONS ---

export const createUnit = async (unitData) => {
    // unitData: { name, unit_type, parent_id, order_index }
    const { data, error } = await supabase
        .from('organizational_units')
        .insert([unitData])
        .select()
        .single();

    if (error) throw error;
    // Invalidate Cache
    cacheService.remove(CACHE_KEYS.HIERARCHY);
    return data;
};

export const updateUnit = async (id, updates) => {
    const { data, error } = await supabase
        .from('organizational_units')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    // Invalidate Cache
    cacheService.remove(CACHE_KEYS.HIERARCHY);
    return data;
};

export const deleteUnit = async (id) => {
    const { error } = await supabase
        .from('organizational_units')
        .delete()
        .eq('id', id);

    if (error) throw error;
    // Invalidate Cache
    cacheService.remove(CACHE_KEYS.HIERARCHY);
    return true;
};

export const fetchPositions = async () => {
    // Check Cache
    const cached = cacheService.get(CACHE_KEYS.POSITIONS);
    if (cached) return cached;

    const { data, error } = await supabase
        .from('positions')
        .select('id, title, unit_type, level')
        .order('level', { ascending: true });

    if (error) throw error;
    cacheService.set(CACHE_KEYS.POSITIONS, data);
    return data;
};
