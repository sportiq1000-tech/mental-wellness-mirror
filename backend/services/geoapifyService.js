/**
 * Geoapify Places API Service
 * Free tier: 3,000 requests/day
 */

const https = require('https');
const { ExternalServiceError } = require('../utils/errorTypes');

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY;

const CATEGORY_FILTERS = {
  parks: 'leisure.park,leisure.park.garden,leisure.park.nature_reserve,natural.forest',
  cafes: 'catering.cafe,catering.cafe.coffee_shop',
  libraries: 'education.library',
  museums: 'entertainment.museum,entertainment.culture.gallery',
  gyms: 'sport.fitness.fitness_centre,sport.fitness',
  meditation: 'service.beauty.spa,service.beauty.massage,leisure.spa'
};

async function searchGeoapifyPlaces(lat, lng, category = 'parks', radius = 5000) {
  if (!GEOAPIFY_API_KEY) {
    throw new ExternalServiceError('Geoapify API key is not configured');
  }

  return new Promise((resolve, reject) => {
    const categories = CATEGORY_FILTERS[category] || CATEGORY_FILTERS.parks;
    
    const params = new URLSearchParams({
      categories: categories,
      filter: `circle:${lng},${lat},${radius}`,
      bias: `proximity:${lng},${lat}`,
      limit: '20',
      apiKey: GEOAPIFY_API_KEY
    });

    const options = {
      hostname: 'api.geoapify.com',
      path: `/v2/places?${params}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      timeout: 10000
    };

    console.log(`📡 Calling Geoapify API for category: ${category}`);
    console.log(`🔍 Categories: ${categories}`);

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      
      res.on('end', () => {
        console.log(`🔍 Geoapify Response Status: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            const places = formatGeoapifyPlaces(result.features || [], lat, lng);
            console.log(`✅ Found ${places.length} places`);
            resolve(places);
          } catch (parseError) {
            console.error('❌ Parse Error:', parseError);
            reject(new ExternalServiceError('Failed to parse Geoapify response'));
          }
        } else if (res.statusCode === 401) {
          console.error('❌ Invalid Geoapify API key');
          reject(new ExternalServiceError('Invalid Geoapify API key'));
        } else if (res.statusCode === 429) {
          console.error('❌ Rate limit exceeded');
          reject(new ExternalServiceError('API rate limit exceeded'));
        } else {
          console.error(`❌ Geoapify Error (${res.statusCode}):`, data.substring(0, 300));
          reject(new ExternalServiceError(`Geoapify API error: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request Error:', error);
      reject(new ExternalServiceError('Failed to connect to Geoapify'));
    });

    req.on('timeout', () => {
      console.error('❌ Request Timeout');
      req.destroy();
      reject(new ExternalServiceError('Geoapify API timeout'));
    });

    req.end();
  });
}

function formatGeoapifyPlaces(features, userLat, userLng) {
  if (!features || features.length === 0) {
    return [];
  }

  return features
    .map(feature => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates;

      if (!coords || !props) return null;

      const placeLat = coords[1];
      const placeLng = coords[0];
      const distance = calculateDistance(userLat, userLng, placeLat, placeLng);

      return {
        id: props.place_id || `geo-${Date.now()}-${Math.random()}`,
        name: props.name || props.street || props.suburb || 'Unnamed Place',
        category: formatCategory(props.categories),
        location: {
          address: formatAddress(props),
          lat: placeLat,
          lng: placeLng
        },
        distance: Math.round(distance)
      };
    })
    .filter(place => place !== null)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 20);
}

function formatCategory(categories) {
  if (!categories || categories.length === 0) return 'Place';
  
  const category = categories[0];
  const parts = category.split('.');
  const lastPart = parts[parts.length - 1];
  
  return lastPart
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function formatAddress(props) {
  if (props.formatted) return props.formatted;

  const parts = [
    props.housenumber,
    props.street,
    props.suburb,
    props.city,
    props.state,
    props.postcode
  ].filter(Boolean);

  if (parts.length > 0) return parts.join(', ');
  if (props.address_line1) return props.address_line1;
  
  return 'Address not available';
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
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

module.exports = {
  searchGeoapifyPlaces
};