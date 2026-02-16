/**
 * Pipedrive Connection Test
 * 
 * This script tests the Pipedrive API connection and verifies:
 * - API credentials are valid
 * - Can fetch activities
 * - Can fetch persons
 * - Activity filtering works correctly
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PIPEDRIVE_API_KEY = process.env.PIPEDRIVE_API_KEY;
const PIPEDRIVE_BASE_URL = 'https://api.pipedrive.com/v1';

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║         Pipedrive Connection Test                            ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Validate credentials
if (!PIPEDRIVE_API_KEY) {
  console.error('❌ Error: Pipedrive API key not found');
  console.error('\nPlease set PIPEDRIVE_API_KEY in your .env file\n');
  console.error('To get your API key:');
  console.error('  1. Log in to Pipedrive');
  console.error('  2. Go to Settings → Personal → API');
  console.error('  3. Copy your API token\n');
  process.exit(1);
}

console.log('📋 Configuration:');
console.log(`   API Key: ${PIPEDRIVE_API_KEY.substring(0, 10)}...`);
console.log(`   Base URL: ${PIPEDRIVE_BASE_URL}`);
console.log('');

async function testConnection() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 1: API Authentication');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    const response = await axios.get(`${PIPEDRIVE_BASE_URL}/users/me`, {
      params: { api_token: PIPEDRIVE_API_KEY }
    });
    
    if (response.data.success) {
      console.log('✅ Authentication successful');
      console.log(`   User: ${response.data.data.name}`);
      console.log(`   Email: ${response.data.data.email}`);
      console.log(`   Company: ${response.data.data.company_name || 'N/A'}`);
      return true;
    } else {
      console.error('❌ Authentication failed:', response.data.error);
      return false;
    }
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    if (err.response) {
      console.error('   Status:', err.response.status);
      console.error('   Message:', err.response.data?.error || err.response.statusText);
    }
    return false;
  }
}

async function testActivities() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 2: Fetch Activities');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    const response = await axios.get(`${PIPEDRIVE_BASE_URL}/activities`, {
      params: {
        api_token: PIPEDRIVE_API_KEY,
        start_date: today,
        end_date: today,
        limit: 100
      }
    });
    
    if (response.data.success) {
      const activities = response.data.data || [];
      console.log(`✅ Activities fetched: ${activities.length} for today`);
      
      if (activities.length > 0) {
        console.log('\n   Sample activities:');
        activities.slice(0, 3).forEach((activity, index) => {
          console.log(`   ${index + 1}. ${activity.subject || 'Untitled'}`);
          console.log(`      Type: ${activity.type}`);
          console.log(`      Status: ${activity.done ? 'Done' : 'To Do'}`);
        });
      } else {
        console.log('   ℹ️  No activities scheduled for today');
        console.log('   💡 Create some test activities in Pipedrive for testing');
      }
      
      return true;
    } else {
      console.error('❌ Failed to fetch activities:', response.data.error);
      return false;
    }
  } catch (err) {
    console.error('❌ Activities fetch error:', err.message);
    return false;
  }
}

async function testPersons() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 3: Fetch Persons (Contacts)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    const response = await axios.get(`${PIPEDRIVE_BASE_URL}/persons`, {
      params: {
        api_token: PIPEDRIVE_API_KEY,
        limit: 10
      }
    });
    
    if (response.data.success) {
      const persons = response.data.data || [];
      console.log(`✅ Persons fetched: ${persons.length}`);
      
      if (persons.length > 0) {
        console.log('\n   Sample contacts:');
        persons.slice(0, 3).forEach((person, index) => {
          console.log(`   ${index + 1}. ${person.name}`);
          console.log(`      Company: ${person.org_name || 'N/A'}`);
          console.log(`      Email: ${person.email?.[0]?.value || 'N/A'}`);
          console.log(`      Phone: ${person.phone?.[0]?.value || 'N/A'}`);
        });
      } else {
        console.log('   ℹ️  No contacts found');
        console.log('   💡 Add some test contacts in Pipedrive');
      }
      
      return true;
    } else {
      console.error('❌ Failed to fetch persons:', response.data.error);
      return false;
    }
  } catch (err) {
    console.error('❌ Persons fetch error:', err.message);
    return false;
  }
}

async function testActivityFiltering() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 4: Activity Filtering (Today + Overdue)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    // Fetch today's activities
    const todayResponse = await axios.get(`${PIPEDRIVE_BASE_URL}/activities`, {
      params: {
        api_token: PIPEDRIVE_API_KEY,
        start_date: today,
        end_date: today,
        done: 0  // Only incomplete activities
      }
    });
    
    // Fetch overdue activities
    const overdueResponse = await axios.get(`${PIPEDRIVE_BASE_URL}/activities`, {
      params: {
        api_token: PIPEDRIVE_API_KEY,
        end_date: yesterday,
        done: 0  // Only incomplete activities
      }
    });
    
    const todayActivities = todayResponse.data.data || [];
    const overdueActivities = overdueResponse.data.data || [];
    
    console.log(`✅ Today's activities: ${todayActivities.length}`);
    console.log(`✅ Overdue activities: ${overdueActivities.length}`);
    console.log(`   Total to import: ${todayActivities.length + overdueActivities.length}`);
    
    if (todayActivities.length === 0 && overdueActivities.length === 0) {
      console.log('\n   ⚠️  WARNING: No activities to import!');
      console.log('   💡 For testing, create activities in Pipedrive:');
      console.log('      - Schedule 3-5 activities for TODAY');
      console.log('      - Optionally create 1-2 overdue activities');
    }
    
    return true;
  } catch (err) {
    console.error('❌ Filtering test error:', err.message);
    return false;
  }
}

async function testDoneActivities() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 5: Done Activities Check');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch completed activities
    const response = await axios.get(`${PIPEDRIVE_BASE_URL}/activities`, {
      params: {
        api_token: PIPEDRIVE_API_KEY,
        start_date: today,
        end_date: today,
        done: 1  // Only completed activities
      }
    });
    
    const doneActivities = response.data.data || [];
    console.log(`✅ Completed activities today: ${doneActivities.length}`);
    
    if (doneActivities.length > 0) {
      console.log('\n   Sample completed activities:');
      doneActivities.slice(0, 3).forEach((activity, index) => {
        console.log(`   ${index + 1}. ${activity.subject || 'Untitled'}`);
        console.log(`      Marked done: ${activity.marked_as_done_time || 'Unknown'}`);
      });
    }
    
    return true;
  } catch (err) {
    console.error('❌ Done activities check error:', err.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const results = {
    connection: false,
    activities: false,
    persons: false,
    filtering: false,
    doneActivities: false,
  };
  
  results.connection = await testConnection();
  
  if (results.connection) {
    results.activities = await testActivities();
    results.persons = await testPersons();
    results.filtering = await testActivityFiltering();
    results.doneActivities = await testDoneActivities();
  }
  
  // Print summary
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    Test Summary                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  console.log(`Authentication:      ${results.connection ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Activities:          ${results.activities ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Persons (Contacts):  ${results.persons ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Filtering:           ${results.filtering ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Done Activities:     ${results.doneActivities ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(r => r === true);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - Pipedrive integration is ready!');
  } else {
    console.log('❌ SOME TESTS FAILED - Please check the errors above');
    console.log('\nCommon fixes:');
    console.log('  - Verify API key is correct (Settings → Personal → API)');
    console.log('  - Check API key has necessary permissions');
    console.log('  - Ensure Pipedrive account is active');
    console.log('  - Create test data (contacts & activities) in Pipedrive');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  process.exit(allPassed ? 0 : 1);
}

// Execute tests
runAllTests().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
