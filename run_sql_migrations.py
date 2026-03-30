import os
import json
from pathlib import Path

# Read migration files
migrations_dir = Path('migrations')
migration_files = sorted([
    'migrations/001_create_core_tables.sql',
    'migrations/002_create_operations_tables.sql',
    'migrations/003_enable_rls.sql'
])

# Read SQL files
for migration_file in migration_files:
    path = Path(migration_file)
    if path.exists():
        print(f"\n✅ Migration found: {migration_file}")
        print(f"   Content preview: {open(path).read()[:100]}...")
    else:
        print(f"❌ Migration missing: {migration_file}")

print("\n📝 To run these migrations:")
print("1. Navigate to https://supabase.com/dashboard/project/updcyyvkauqenhztmbay/sql/new")
print("2. Copy each migration file content into the SQL editor")
print("3. Click 'Run' for each migration")
print("4. Verify tables appear in Table Editor")
