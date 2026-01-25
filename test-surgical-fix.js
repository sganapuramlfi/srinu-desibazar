/**
 * SURGICAL FIX TEST
 * Direct test of the fixed AbrakadabraAI service
 */

console.log('🧞‍♂️ Testing surgical fix for "spice pavilion" query...\n');

async function testSurgicalFix() {
  try {
    // Set up environment like the server
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';
    
    // Import the fixed service (same path as debug endpoint)
    const { abrakadabra } = await import('./server/services/abrakadabraService.js');
    
    // Test the query that was failing
    const query = "spice pavilion";
    const userContext = {}; // No authentication (public user)
    
    console.log(`🔍 Testing query: "${query}"`);
    console.log(`👤 User context:`, userContext);
    console.log(`🚀 This should trigger the fast path (bypass security)\n`);
    
    // Process the query
    const result = await abrakadabra.processQuery({
      query: query,
      userLocation: 'Melbourne',
      preferences: {},
      userContext: userContext
    });
    
    console.log('✅ RESULTS:');
    console.log('Understanding:', result.understanding);
    console.log('\nRecommendations:');
    result.recommendations.forEach((business, idx) => {
      console.log(`  ${idx + 1}. ${business.name} (Score: ${business._vectorScore || 'N/A'})`);
    });
    
    console.log('\nInsights:');
    result.insights.forEach(insight => console.log(`  • ${insight}`));
    
    console.log('\nMetadata:');
    console.log(`  • Fast path: ${result.metadata?.fast_path || false}`);
    console.log(`  • Security bypassed: ${result.metadata?.security_bypassed || false}`);
    console.log(`  • Search method: ${result.metadata?.match_info?.searchMethod || 'unknown'}`);
    console.log(`  • Total matches: ${result.metadata?.match_info?.totalMatches || 0}`);
    
    // Check if we found Spice Pavilion
    const spicePavilion = result.recommendations.find(b => 
      b.name.toLowerCase().includes('spice pavilion')
    );
    
    if (spicePavilion) {
      console.log(`\n🎉 SUCCESS! Found "Spice Pavilion" with score: ${spicePavilion._vectorScore}`);
    } else {
      console.log(`\n❌ FAILED! "Spice Pavilion" not found in recommendations`);
    }
    
  } catch (error) {
    console.error('🚨 ERROR:', error.message);
    console.error('Stack:', error.stack);
  }
}

testSurgicalFix();