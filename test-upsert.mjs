import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vmygmbqjmdamubmcvglt.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Need to use service role or mock authenticated user. I will just use service role key if available, 
// or I can read from the environment variables.
import dotenv from 'dotenv';
dotenv.config({ path: './frontend/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("URL", supabaseUrl);

const supabase = createClient(supabaseUrl, serviceKey || supabaseKey);

async function test() {
    console.log("Testing upsert...");
    
    // We need a valid unit_id. Let's just fetch one.
    const { data: units } = await supabase.from('organizational_units').select('id').limit(1);
    if (!units || units.length === 0) return console.log("No units");
    const unitId = units[0].id;
    
    const { data: sessionData, error: sessionError } = await supabase
        .from('attendance_sessions')
        .upsert({
            unit_id: unitId,
            session_date: new Date().toISOString().split('T')[0],
            created_by: null,
            first_timers_count: 0,
            souls_won_count: 0,
        }, { onConflict: 'unit_id,session_date' })
        .select()
        .single();
        
    if (sessionError) {
        console.error("SESSION UPSERT ERROR:", sessionError);
        return;
    }
    console.log("SESSION UPSERT SUCCESS:", sessionData.id);

    // Get a person
    const { data: people } = await supabase.from('people').select('id').limit(1);
    if (!people || people.length === 0) return console.log("No people");

    const records = [{
        session_id: sessionData.id,
        person_id: people[0].id,
        status: 'PRESENT'
    }];

    const { error: recordsError } = await supabase
        .from('attendance_records')
        .upsert(records, { onConflict: 'session_id,person_id' });

    if (recordsError) {
        console.error("RECORDS UPSERT ERROR:", recordsError);
    } else {
        console.log("RECORDS UPSERT SUCCESS");
    }
}

test();
