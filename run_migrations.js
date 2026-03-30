const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = "https://updcyyvkauqenhztmbay.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwZGN5eXZrYXVxZW5oenRtYmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNTE0NTksImV4cCI6MjA3MTYyNzQ1OX0.GYs_czOFbTny7mDfY719IzcJ36FPlcsq825CcDLD_F4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log("Testing Supabase connection...");
  const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
  if (error) {
    console.error("❌ Connection failed:", error.message);
  } else {
    console.log("✅ Connection successful");
  }
}

testConnection().catch(console.error);
