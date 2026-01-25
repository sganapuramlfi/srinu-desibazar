/**
 * Direct test of vector search service
 */

import { businessVectorService } from './server/services/businessVectorService.js';

async function testVectorSearch() {
  console.log('🧪 Testing Vector Search Service');
  
  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test search
  console.log('\n=== Test 1: Search for "spice pavilion" ===');
  const result1 = await businessVectorService.searchBusinesses('spice pavilion');
  console.log('Results:', result1);
  
  console.log('\n=== Test 2: Search for "italian" ===');
  const result2 = await businessVectorService.searchBusinesses('italian');
  console.log('Results:', result2);
  
  console.log('\n=== Test 3: Search for "restaurant" ===');  
  const result3 = await businessVectorService.searchBusinesses('restaurant');
  console.log('Results:', result3);
  
  console.log('\n=== Vector Service Stats ===');
  const stats = businessVectorService.getStats();
  console.log('Stats:', stats);
  
  process.exit(0);
}

testVectorSearch().catch(console.error);