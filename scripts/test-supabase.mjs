/**
 * Supabase Connection Test
 * 
 * This script tests the Supabase connection and verifies:
 * - Connection can be established
 * - Tables exist (contacts, calls, deals)
 * - Basic read operations work
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║         Supabase Connection Test                             ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Validate credentials
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found');
  console.error('\nPlease set the following in your .env file:');
  console.error('  - VITE_SUPABASE_URL');
  console.error('  - VITE_SUPABASE_ANON_KEY\n');
  process.exit(1);
}

console.log('📋 Configuration:');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Key: ${supabaseKey.substring(0, 20)}...`);
console.log('');

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 1: Basic Connection');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Test basic connection by querying a table
    const { data, error } = await supabase.from('contacts').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Connection successful');
    return true;
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    return false;
  }
}

async function testTables() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 2: Table Existence');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const tables = ['contacts', 'calls', 'deals'];
  let allTablesExist = true;
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        console.error(`❌ Table '${table}' error:`, error.message);
        allTablesExist = false;
      } else {
        console.log(`✅ Table '${table}' exists`);
      }
    } catch (err) {
      console.error(`❌ Table '${table}' check failed:`, err.message);
      allTablesExist = false;
    }
  }
  
  return allTablesExist;
}

async function testDataRead() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 3: Data Operations');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Test contacts table
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .limit(5);
    
    if (contactsError) {
      console.error('❌ Reading contacts failed:', contactsError.message);
    } else {
      console.log(`✅ Read contacts: ${contacts.length} records`);
      if (contacts.length > 0) {
        console.log('   Sample contact:', contacts[0].name || contacts[0].id);
      }
    }
    
    // Test calls table
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('*')
      .limit(5);
    
    if (callsError) {
      console.error('❌ Reading calls failed:', callsError.message);
    } else {
      console.log(`✅ Read calls: ${calls.length} records`);
    }
    
    // Test deals table
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select('*')
      .limit(5);
    
    if (dealsError) {
      console.error('❌ Reading deals failed:', dealsError.message);
    } else {
      console.log(`✅ Read deals: ${deals.length} records`);
    }
    
    return !contactsError && !callsError && !dealsError;
  } catch (err) {
    console.error('❌ Data operation error:', err.message);
    return false;
  }
}

async function testAuth() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 4: Authentication');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('⚠️  No active session (this is normal for anon key)');
    } else {
      console.log('✅ Auth system accessible');
    }
    
    return true;
  } catch (err) {
    console.error('❌ Auth check error:', err.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const results = {
    connection: false,
    tables: false,
    dataRead: false,
    auth: false,
  };
  
  results.connection = await testConnection();
  
  if (results.connection) {
    results.tables = await testTables();
    results.dataRead = await testDataRead();
    results.auth = await testAuth();
  }
  
  // Print summary
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    Test Summary                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  console.log(`Connection:      ${results.connection ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Tables:          ${results.tables ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Data Operations: ${results.dataRead ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Authentication:  ${results.auth ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(r => r === true);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - Supabase is ready to use!');
  } else {
    console.log('❌ SOME TESTS FAILED - Please check the errors above');
    console.log('\nCommon fixes:');
    console.log('  - Verify .env credentials are correct');
    console.log('  - Check Supabase project is active');
    console.log('  - Ensure tables are created (run migrations)');
    console.log('  - Check Row Level Security (RLS) policies');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  process.exit(allPassed ? 0 : 1);
}

// Execute tests
runAllTests().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
