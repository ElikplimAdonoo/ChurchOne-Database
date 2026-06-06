import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://adtugmhftcjzswxtbyue.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdHVnbWhmdGNqenN3eHRieXVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYxMjc5MSwiZXhwIjoyMDg1MTg4NzkxfQ.YEcrEb6xFE0D2nH9EwSwuwAn6_uEsIIfPlpmQ9y9llM";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
    // Fetch people like peopleService.js does
    const { data: peopleData, error: peopleError } = await supabase
        .from('people')
        .select(`
            id,
            full_name,
            photo_url,
            is_active,
            is_placeholder,
            created_at,
            assignments:position_assignments(
                id,
                unit_id,
                position_id,
                is_active,
                position:positions(title, level, unit_type),
                unit:organizational_units(name, unit_type)
            ),
            attendance_records (
                status
            )
        `)
        .order('full_name');

    if (peopleError) {
        console.error(peopleError);
        return;
    }

    const people = peopleData.map(person => {
        const primaryAssignment = person.assignments?.find(a => a.is_active);
        const isSystemUnitPlaceholder = person.is_placeholder && person.full_name.includes(' - Leader');
        
        let status;
        if (!person.is_active && !isSystemUnitPlaceholder) {
            status = 'Inactive';
        } else if (person.is_placeholder && !isSystemUnitPlaceholder) {
            status = 'Pending';
        } else if (isSystemUnitPlaceholder) {
            status = 'System'; 
        } else {
            status = 'Active';
        }

        let presentCount = 0;
        if (person.attendance_records && person.attendance_records.length > 0) {
            presentCount = person.attendance_records.filter(r => r.status === 'PRESENT').length;
        }

        const roleTitle = primaryAssignment?.position?.title || 'Unassigned';
        let membership_state = roleTitle;
        
        // This is what is currently in peopleService.js
        if (roleTitle === 'Member' || roleTitle === 'Unassigned') {
            const createdDate = new Date(person.created_at || '2000-01-01');
            const cutoffDate = new Date('2026-03-31T00:00:00Z');
            
            if (createdDate < cutoffDate) {
                membership_state = 'Member';
            } else {
                if (presentCount === 1) membership_state = 'First Timer';
                else if (presentCount === 2 || presentCount === 3) membership_state = 'Brethren';
                else if (presentCount >= 4) membership_state = 'Member';
                else membership_state = 'Unattended';
            }
        }

        return {
            id: person.id,
            name: person.full_name,
            role: roleTitle,
            unit: primaryAssignment?.unit?.name || 'Unassigned',
            unit_id: primaryAssignment?.unit_id,
            status,
            membership_state,
            present_count: presentCount
        };
    });

    console.log("=== PEOPLE MATCHING PEOPLE_SERVICE LOGIC ===");
    console.log("Total people:", people.length);

    // Apply filtering like basePeople in PeopleDirectoryPage
    // Hide staging members/first timers who are not yet Brethren or Members
    // In basePeople:
    const basePeople = people.filter(p => {
        if (p.status === 'System') return false; // basePeople logic doesn't explicitly hide system, but status filter might? Wait, statusCounts checks Active, Inactive, Pending
        if (p.membership_state === 'First Timer' || p.membership_state === 'Unattended') {
            return false;
        }
        return true;
    });

    console.log("BasePeople count (excluding System):", basePeople.filter(p => p.status !== 'System').length);
    console.log("BasePeople list (All columns):");
    basePeople.forEach(p => {
        console.log(`- Name: ${p.name}, Status: ${p.status}, Role: ${p.role}, State: ${p.membership_state}, Unit: ${p.unit}`);
    });
}
main();
