import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://adtugmhftcjzswxtbyue.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdHVnbWhmdGNqenN3eHRieXVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYxMjc5MSwiZXhwIjoyMDg1MTg4NzkxfQ.YEcrEb6xFE0D2nH9EwSwuwAn6_uEsIIfPlpmQ9y9llM";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
    const { data: units, error } = await supabase
        .from('organizational_units')
        .select('id, parent_id, name, unit_type, order_index, is_placeholder')
        .order('order_index', { ascending: true });
        
    if (error) {
        console.error("DB error:", error);
        return;
    }
    
    // Check how the DB returns the churches
    const churches = units.filter(u => u.unit_type === 'CHURCH');
    console.log("CHURCHES from DB in order:");
    churches.forEach(c => console.log(`${c.name} (order: ${c.order_index})`));

    // Simulate tree building
    const unitMap = new Map();
    units.forEach(unit => {
        unitMap.set(unit.id, { ...unit, children: [] });
    });

    const tree = [];
    units.forEach(unit => {
        if (unit.parent_id) {
            const parent = unitMap.get(unit.parent_id);
            if (parent) {
                parent.children.push(unitMap.get(unit.id));
            }
        } else {
            tree.push(unitMap.get(unit.id));
        }
    });

    const root = tree[0];
    console.log("\nROOT CHILDREN IN TREE:");
    root.children.forEach(c => console.log(`${c.name} (order: ${c.order_index})`));
}

main();
