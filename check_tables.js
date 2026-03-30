const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://updcyyvkauqenhztmbay.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwZGN5eXZrYXVxZW5oenRtYmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNTE0NTksImV4cCI6MjA3MTYyNzQ1OX0.GYs_czOFbTny7mDfY719IzcJ36FFlcsq825CcDLD_F4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTables() {
  console.log("Checking existing tables...\n");
  
  const tables = ['profiles', 'products', 'listings', 'expenses', 'mileage'];
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error && error.code === '42P01') {
        console.log(`❌ ${table} - TABLE DOES NOT EXIST`);
      } else if (error) {
        console.log(`⚠️  ${table} - ERROR: ${error.message}`);
      } else {
        console.log(`✅ ${table} - EXISTS (${count || 0} rows)`);
      }
    } catch (e) {
      console.log(`❌ ${table} - Exception: ${e.message}`);
    }
  }
}

checkTables().catch(console.error);
