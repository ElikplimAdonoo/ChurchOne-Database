import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './frontend/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    // Let's grab the first user's email from the DB using service key, then sign in with it.
    const adminSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // We need an email that we can sign in with. We don't have passwords. 
    // Wait, we can't easily sign in without a password unless we create a magic link or use the admin auth user object.
    
    // Actually, we can just look at the RLS policies in the database using the service role to verify they are perfectly correct.
    const { data: policies, error } = await adminSupabase.rpc('get_policies'); // this might not exist
    
    const { data: dbPolicies } = await adminSupabase.from('pg_policies').select('*').in('tablename', ['attendance_sessions', 'attendance_records']);
    
    console.log("POLICIES:");
    console.log(dbPolicies);
}
test();
