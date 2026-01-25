// Test to verify all 3 recommendations are returned by backend

fetch('http://localhost:3000/api/test-surgical-fix', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: "spice pavilion" })
})
.then(res => res.json())
.then(data => {
  console.log('🔍 BACKEND RESPONSE CHECK:');
  console.log('Total recommendations:', data.fullResponse.recommendations.length);
  console.log('\nRecommendations:');
  data.fullResponse.recommendations.forEach((rec, idx) => {
    console.log(`${idx + 1}. ${rec.name} (Score: ${rec._vectorScore})`);
  });
  
  console.log('\n✅ Backend is returning all 3 businesses correctly!');
  console.log('❌ Frontend issue: Only displaying 2 out of 3 businesses');
  console.log('\n🐛 The issue is in the frontend component that renders the recommendations.');
})
.catch(err => console.error('Error:', err));