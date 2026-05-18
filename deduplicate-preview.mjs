import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://adtugmhftcjzswxtbyue.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdHVnbWhmdGNqenN3eHRieXVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYxMjc5MSwiZXhwIjoyMDg1MTg4NzkxfQ.YEcrEb6xFE0D2nH9EwSwuwAn6_uEsIIfPlpmQ9y9llM";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
    const { data: people } = await supabase.from('people').select('*').order('created_at', { ascending: true });
    
    const nameCounts = {};
    for (const p of people) {
        if (!nameCounts[p.full_name]) nameCounts[p.full_name] = [];
        nameCounts[p.full_name].push(p);
    }
    
    let actions = [];

    for (const [name, records] of Object.entries(nameCounts)) {
        if (records.length > 1) {
            console.log(`\n--- Duplicate: ${name} (${records.length} records) ---`);
            for (const r of records) {
                console.log(`  ID: ${r.id} | Created: ${r.created_at} | Auth: ${r.auth_user_id} | Email: ${r.email}`);
            }

            // Simple case: 2 records, one has auth_user_id, one doesn't
            if (records.length === 2) {
                const withAuth = records.find(r => r.auth_user_id !== null);
                const withoutAuth = records.find(r => r.auth_user_id === null);

                if (withAuth && withoutAuth) {
                    console.log(`  [ACTION] Merge ${withAuth.id} INTO ${withoutAuth.id}`);
                    actions.push({
                        type: 'MERGE_SIMPLE',
                        name,
                        targetKeepId: withoutAuth.id,
                        sourceDeleteId: withAuth.id,
                        authId: withAuth.auth_user_id,
                        email: withAuth.email,
                        personalEmail: withAuth.personal_email
                    });
                } else if (records.every(r => r.auth_user_id !== null)) {
                     console.log(`  [WARNING] Multiple records with auth_user_id! Need manual review.`);
                } else if (records.every(r => r.auth_user_id === null)) {
                     console.log(`  [WARNING] Multiple records with NO auth_user_id. Skipping.`);
                }
            } else {
                 console.log(`  [WARNING] ${records.length} records found. Skipping for manual review.`);
            }
        }
    }

    console.log(`\nFound ${actions.length} simple merge opportunities.`);
}
main();
