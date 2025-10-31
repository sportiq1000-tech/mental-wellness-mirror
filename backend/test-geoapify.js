/**
 * Test Geoapify Service
 * Run: node backend/test-geoapify.js
 */

require('dotenv').config();

console.log('🔍 Testing Geoapify Setup...\n');

// Check API key
const apiKey = process.env.GEOAPIFY_API_KEY;
if (apiKey) {
  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...');
} else {
  console.log('❌ API Key NOT found in .env');
  console.log('💡 Add this to your .env file:');
  console.log('   GEOAPIFY_API_KEY=your_key_here');
  process.exit(1);
}

// Test service import
try {
  const { searchGeoapifyPlaces } = require('./services/geoapifyService');
  console.log('✅ Service imported successfully');
  
  // Test API call
  console.log('\n📡 Testing API call to Geoapify...\n');
  
  searchGeoapifyPlaces(11.0766742, 77.1421487, 'parks', 5000)
    .then(places => {
      console.log(`\n✅ SUCCESS! Found ${places.length} places\n`);
      
      if (places.length > 0) {
        console.log('📍 Top 5 Results:\n');
        places.slice(0, 5).forEach((p, i) => {
          console.log(`${i + 1}. ${p.name}`);
          console.log(`   📝 ${p.location.address}`);
          console.log(`   📏 ${(p.distance/1000).toFixed(2)} km away`);
          console.log(`   🏷️  ${p.category}`);
          console.log('');
        });
      } else {
        console.log('⚠️ No places found. Try a different location or category.');
      }
      
      console.log('✅ Test completed successfully!');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ API Test Failed:', err.message);
      if (err.stack) {
        console.error('\n📚 Stack trace:');
        console.error(err.stack);
      }
      process.exit(1);
    });
    
} catch (err) {
  console.error('❌ Service import failed:', err.message);
  console.error('\n📚 Stack trace:');
  console.error(err.stack);
  process.exit(1);
}