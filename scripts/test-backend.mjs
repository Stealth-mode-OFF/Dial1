#!/usr/bin/env node

/**
 * Backend Connectivity Test Script
 * Tests Supabase and Pipedrive connections
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
// SECURITY: never hardcode Supabase keys in git. Use env vars only.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

console.log('🧪 Testing Backend Connectivity...\n');

// Test Supabase
async function testSupabase() {
  console.log('📊 Testing Supabase connection...');
  
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.log('   ❌ Supabase not configured in env.');
      console.log('   ℹ️  Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (or SUPABASE_URL + SUPABASE_ANON_KEY) and retry.');
      return false;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Test basic query
    const { data, error } = await supabase
      .from('campaigns')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log(`   ⚠️  Supabase warning: ${error.message}`);
      console.log('   ℹ️  Tables might not exist yet - this is OK for initial setup');
      return false;
    }
    
    console.log('   ✅ Supabase connection successful!');
    console.log(`   📍 URL: ${SUPABASE_URL}`);
    return true;
  } catch (error) {
    console.log(`   ❌ Supabase connection failed: ${error.message}`);
    return false;
  }
}

// Test Pipedrive
async function testPipedrive() {
  console.log('\n📞 Testing Pipedrive connection...');
  
  const PIPEDRIVE_TOKEN = process.env.VITE_PIPEDRIVE_API_TOKEN;
  const PIPEDRIVE_DOMAIN = process.env.VITE_PIPEDRIVE_DOMAIN;
  
  if (!PIPEDRIVE_TOKEN || PIPEDRIVE_TOKEN === 'your_pipedrive_token_here') {
    console.log('   ⚠️  Pipedrive not configured (no API token in .env)');
    console.log('   ℹ️  Add VITE_PIPEDRIVE_API_TOKEN to .env to enable Pipedrive');
    return false;
  }
  
  try {
    const response = await fetch(`https://${PIPEDRIVE_DOMAIN}.pipedrive.com/api/v1/users?api_token=${PIPEDRIVE_TOKEN}`);
    
    if (!response.ok) {
      console.log(`   ❌ Pipedrive connection failed: ${response.statusText}`);
      return false;
    }
    
    console.log('   ✅ Pipedrive connection successful!');
    return true;
  } catch (error) {
    console.log(`   ❌ Pipedrive connection failed: ${error.message}`);
    return false;
  }
}

// Run tests
async function runTests() {
  const supabaseOk = await testSupabase();
  const pipedriveOk = await testPipedrive();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Backend Status Summary:');
  console.log('='.repeat(50));
  console.log(`Supabase:  ${supabaseOk ? '✅ Connected' : '⚠️  Not fully configured'}`);
  console.log(`Pipedrive: ${pipedriveOk ? '✅ Connected' : '⚠️  Not configured'}`);
  console.log('='.repeat(50));
  
  if (supabaseOk || pipedriveOk) {
    console.log('\n✨ Backend is functional! You can start using the app.');
  } else {
    console.log('\n⚠️  Backend needs configuration. Check .env file.');
  }
  
  console.log('\n💡 Tip: Update .env with your credentials and restart the server.\n');
}

runTests().catch(console.error);
