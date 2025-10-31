/**
 * OpenStreetMap Service (Overpass API)
 * No API key required - 100% free!
 */

const https = require('https');
const { ExternalServiceError } = require('../utils/errorTypes');

const OVERPASS_API_ENDPOINT = 'overpass-api.de';

const CATEGORY_MAPPING = {
  parks: [
    '[leisure=park]',
    '[leisure=garden]',
    '[leisure=nature_reserve]'
  ],
  cafes: [
    '[amenity=cafe]',
    '[amenity=coffee_shop]'
  ],
  libraries: [
    '[amenity=library]'
  ],
  museums: [
    '[tourism=museum]',
    '[tourism=gallery]'
  ],
};

async function getNearbyPlaces(lat, lng, category = 'parks', radius = 5000) {
  const tags = CATEGORY_MAPPING[category] || CATEGORY_MAPPING.parks;

  const queryParts = tags.map(tag => 
    `node${tag}(around:${radius},${lat},${lng});way${tag}(around:${radius},${lat},${lng});`
  ).join('');

  const query = `[out:json][timeout:25];(${queryParts});out body center 50;`;
  
  console.log(`📡 Calling Overpass API for category: ${category}`);
  console.log(`🔍 Query:`, query);

  return new Promise((resolve, reject) => {
    const postData = `data=${encodeURIComponent(query)}`;
    
    const options = {
      hostname: OVERPASS_API_ENDPOINT,
      path: '/api/interpreter',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      
      res.on('end', () => {
        console.log(`🔍 Overpass Response Status: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            const places = formatPlaces(result.elements || [], lat, lng);
            console.log(`✅ Found ${places.length} places`);
            resolve(places);
          } catch (parseError) {
            console.error('❌ Parse Error:', parseError);
            reject(new ExternalServiceError('Failed to parse Overpass response'));
          }
        } else {
          console.error('❌ Overpass Error:', data);
          reject(new ExternalServiceError(`Overpass API error: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request Error:', error);
      reject(new ExternalServiceError('Failed to connect to Overpass API'));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new ExternalServiceError('Overpass API request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

function formatPlaces(elements, userLat, userLng) {
  return elements
    .filter(el => el.tags && el.tags.name)
    .map(el => {
      const location = el.center || el;
      const distance = calculateDistance(userLat, userLng, location.lat, location.lon);
      
      return {
        id: `osm-${el.id}`,
        name: el.tags.name,
        category: getCategoryName(el.tags),
        location: {
          address: formatAddress(el.tags),
          lat: location.lat,
          lng: location.lon,
        },
        distance: Math.round(distance)
      };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 20); // Limit to 20 results
}

function getCategoryName(tags) {
  const key = tags.leisure || tags.amenity || tags.tourism || 'place';
  return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatAddress(tags) {
  const parts = [
    tags['addr:street'],
    tags['addr:housenumber'],
    tags['addr:city'],
    tags['addr:postcode']
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Address not available';
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

module.exports = { getNearbyPlaces };