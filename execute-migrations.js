#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read migration files
const migrationDir = './migrations';
const migrations = fs.readdirSync(migrationDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log('Found migrations:', migrations);
console.log('\nTo execute migrations manually:');
console.log('1. Go to Supabase Dashboard: https://app.supabase.com');
console.log('2. Select project: wrenlist-clean (tewtfroudyicwfubgcqi)');
console.log('3. Go to SQL Editor');
console.log('4. Click "New Query"');
console.log('5. Copy/paste the SQL from each file below in order:\n');

migrations.forEach((file, idx) => {
  const filePath = path.join(migrationDir, file);
  const sql = fs.readFileSync(filePath, 'utf8');

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Step ${idx + 1}: ${file}`);
  console.log(`${'='.repeat(70)}`);
  console.log(sql);
  console.log(`${'='.repeat(70)}`);
});

console.log('\n\nAfter executing all migrations, verify with:');
console.log('- Check tables in Supabase Dashboard → Tables view');
console.log('- Should see: profiles, products, listings, expenses, mileage');
console.log('- Run: npm run dev');
console.log('- Navigate to: http://localhost:3004/register');
console.log('- Test signup flow');
