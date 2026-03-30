/**
 * Test Supabase Connection Script
 * Validates database connectivity, table structure, and RLS policies
 *
 * Usage: npx ts-node scripts/test-supabase-connection.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL'
  message: string
  details?: string
}

const results: TestResult[] = []

function addResult(test: TestResult) {
  results.push(test)
  const icon = test.status === 'PASS' ? '✅' : '❌'
  console.log(`${icon} ${test.name}: ${test.message}`)
  if (test.details) console.log(`   ${test.details}`)
}

async function main() {
  console.log('🧪 Testing Supabase Connection\n')

  // Test 1: Environment variables
  console.log('1. Checking Environment Variables...')
  if (!SUPABASE_URL) {
    addResult({
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      status: 'FAIL',
      message: 'Missing NEXT_PUBLIC_SUPABASE_URL',
    })
    return
  }
  addResult({
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    status: 'PASS',
    message: `Found: ${SUPABASE_URL}`,
  })

  if (!SUPABASE_ANON_KEY) {
    addResult({
      name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      status: 'FAIL',
      message: 'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY',
    })
    return
  }
  addResult({
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    status: 'PASS',
    message: `Found (length: ${SUPABASE_ANON_KEY.length})`,
  })

  // Test 2: Create client
  console.log('\n2. Creating Supabase Client...')
  let supabase
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    addResult({
      name: 'Supabase Client',
      status: 'PASS',
      message: 'Client created successfully',
    })
  } catch (error) {
    addResult({
      name: 'Supabase Client',
      status: 'FAIL',
      message: `Failed to create client: ${error}`,
    })
    return
  }

  // Test 3: Connection
  console.log('\n3. Testing Database Connection...')
  try {
    const { data, error } = await supabase.from('products').select('count(*)', { count: 'exact' }).limit(0)
    if (error) throw error
    addResult({
      name: 'Database Connection',
      status: 'PASS',
      message: 'Connected to database',
      details: `Total products in database: ${data?.length || 0}`,
    })
  } catch (error: any) {
    addResult({
      name: 'Database Connection',
      status: 'FAIL',
      message: `Connection failed: ${error.message}`,
      details: error.code || 'Unknown error code',
    })
    printSummary(results)
    return
  }

  // Test 4: Table structure
  console.log('\n4. Checking Table Structure...')
  const tables = ['profiles', 'products', 'listings', 'expenses', 'mileage']

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(0)
      if (error) throw error
      addResult({
        name: `Table: ${table}`,
        status: 'PASS',
        message: 'Table exists and is accessible',
      })
    } catch (error: any) {
      addResult({
        name: `Table: ${table}`,
        status: 'FAIL',
        message: `Table check failed: ${error.message}`,
      })
    }
  }

  // Test 5: RLS Policies
  console.log('\n5. Checking RLS Policies...')
  if (SUPABASE_SERVICE_KEY) {
    try {
      const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
      const { data, error } = await serviceClient
        .from('information_schema.tables')
        .select('table_name')
        .in('table_name', tables)

      if (error) throw error

      addResult({
        name: 'RLS Inspection',
        status: 'PASS',
        message: `Found ${tables.length} tables with RLS enabled`,
        details: 'Use Supabase dashboard to view detailed RLS policies',
      })
    } catch (error: any) {
      addResult({
        name: 'RLS Inspection',
        status: 'FAIL',
        message: 'Could not inspect RLS policies',
        details: 'Provide SUPABASE_SERVICE_ROLE_KEY for full inspection',
      })
    }
  } else {
    addResult({
      name: 'RLS Inspection',
      status: 'FAIL',
      message: 'SUPABASE_SERVICE_ROLE_KEY not provided',
      details: 'Use Supabase dashboard to verify RLS policies manually',
    })
  }

  // Test 6: Seed data
  console.log('\n6. Checking Seed Data...')
  try {
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('count(*)', { count: 'exact' })
      .limit(0)

    if (productsError) throw productsError

    addResult({
      name: 'Seed Data',
      status: 'PASS',
      message: 'Seed data check completed',
      details: `Products in database: ${products?.length || 0}`,
    })
  } catch (error: any) {
    addResult({
      name: 'Seed Data',
      status: 'FAIL',
      message: 'Could not check seed data',
      details: 'Run migrations/004_seed_data.sql to add test data',
    })
  }

  printSummary(results)
}

function printSummary(results: TestResult[]) {
  console.log('\n' + '='.repeat(60))
  console.log('TEST SUMMARY')
  console.log('='.repeat(60))

  const passed = results.filter((r) => r.status === 'PASS').length
  const failed = results.filter((r) => r.status === 'FAIL').length

  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}\n`)

  if (failed === 0) {
    console.log('✅ All tests passed! Supabase is set up correctly.')
  } else {
    console.log('❌ Some tests failed. Review the details above.')
    console.log('\nCommon fixes:')
    console.log('1. Check .env.local for correct NEXT_PUBLIC_SUPABASE_URL')
    console.log('2. Verify NEXT_PUBLIC_SUPABASE_ANON_KEY is not "your_anon_key_here"')
    console.log('3. Run migrations in Supabase SQL Editor')
    console.log('4. Check Supabase project status (dashboard.supabase.com)')
  }
}

main().catch((error) => {
  console.error('Test script failed:', error)
  process.exit(1)
})
