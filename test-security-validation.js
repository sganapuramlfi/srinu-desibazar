/**
 * SECURITY VALIDATION TESTS
 * Ensures private operations remain protected after surgical fixes
 */

const BASE_URL = 'http://localhost:3000';

console.log('🔒 SECURITY VALIDATION TEST SUITE\n');

// Test scenarios
const tests = [
  {
    name: 'Public Search - Should Work Without Auth',
    endpoint: '/api/ai-abrakadabra-fixed/public/query',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { query: 'spice pavilion', location: 'Melbourne' },
    expectedStatus: 200,
    expectSuccess: true
  },
  {
    name: 'Registered Endpoint - Should Require Auth',
    endpoint: '/api/ai-abrakadabra-fixed/registered/query',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { query: 'spice pavilion', location: 'Melbourne' },
    expectedStatus: 401,
    expectSuccess: false
  },
  {
    name: 'Business Dashboard - Should Require Auth',
    endpoint: '/api/businesses/1/services',
    method: 'GET',
    headers: {},
    body: null,
    expectedStatus: 401,
    expectSuccess: false
  },
  {
    name: 'Create Booking - Should Require Auth',
    endpoint: '/api/services/1/bookings',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { startTime: new Date(), endTime: new Date(), notes: 'Test' },
    expectedStatus: 401,
    expectSuccess: false
  },
  {
    name: 'Update Business Profile - Should Require Auth',
    endpoint: '/api/businesses/1/profile',
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: { name: 'Hacked Name' },
    expectedStatus: 401,
    expectSuccess: false
  },
  {
    name: 'Admin Modules - Should Require Admin Auth',
    endpoint: '/api/admin/modules/status',
    method: 'GET',
    headers: {},
    body: null,
    expectedStatus: 401,
    expectSuccess: false
  },
  {
    name: 'Public Business Search - Should Work',
    endpoint: '/api/businesses/search?q=restaurant',
    method: 'GET',
    headers: {},
    body: null,
    expectedStatus: 200,
    expectSuccess: true
  },
  {
    name: 'Public Storefront - Should Work',
    endpoint: '/api/businesses/24/profile',
    method: 'GET',
    headers: {},
    body: null,
    expectedStatus: 200,
    expectSuccess: true
  }
];

// Run tests
async function runSecurityTests() {
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const options = {
        method: test.method,
        headers: test.headers
      };
      
      if (test.body) {
        options.body = JSON.stringify(test.body);
      }
      
      const response = await fetch(BASE_URL + test.endpoint, options);
      const statusMatches = response.status === test.expectedStatus;
      
      if (statusMatches) {
        console.log(`✅ PASS: ${test.name}`);
        console.log(`   Status: ${response.status} (expected ${test.expectedStatus})`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${test.name}`);
        console.log(`   Status: ${response.status} (expected ${test.expectedStatus})`);
        failed++;
      }
      
      // For successful public endpoints, verify data
      if (test.expectSuccess && response.ok) {
        const data = await response.json();
        if (test.endpoint.includes('public/query')) {
          console.log(`   ✓ Public search returned ${data.recommendations?.length || 0} results`);
        }
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${test.name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
    
    console.log(''); // Empty line between tests
  }
  
  // Summary
  console.log('🔒 SECURITY TEST SUMMARY');
  console.log('========================');
  console.log(`Total Tests: ${tests.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${Math.round((passed / tests.length) * 100)}%`);
  
  // Security conclusions
  console.log('\n🛡️ SECURITY CONCLUSIONS:');
  if (failed === 0) {
    console.log('✅ All security boundaries intact!');
    console.log('✅ Public endpoints accessible without auth');
    console.log('✅ Private endpoints properly protected');
    console.log('✅ Admin endpoints require admin auth');
  } else {
    console.log('⚠️ Some security tests failed - review results above');
  }
}

// Run the tests
runSecurityTests().catch(console.error);