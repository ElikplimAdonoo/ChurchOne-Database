import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://adtugmhftcjzswxtbyue.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdHVnbWhmdGNqenN3eHRieXVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYxMjc5MSwiZXhwIjoyMDg1MTg4NzkxfQ.YEcrEb6xFE0D2nH9EwSwuwAn6_uEsIIfPlpmQ9y9llM";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT prosrc FROM pg_proc WHERE proname = 'get_email_auth_mode';"
    });
    console.log(data, error);
}

main();
