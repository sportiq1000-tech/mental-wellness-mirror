/**
 * Foursquare Places API Service
 */

const https = require('https');

const FOURSQUARE_API_KEY = process.env.FOURSQUARE_API_KEY;
const FOURSQUARE_API_URL = 'https://api.foursquare.com/v3/places/search';

// Wellness-related category IDs
const WELLNESS_CATEGORIES = [
    '16032', // Park
    '17067', // Yoga Studio
    '17069', // Meditation Center
    '13003', // Gym / Fitness Center
    '16027'  // Nature Preserve
];

/**
 * Search for wellness places near coordinates
 */
async function searchWellnessPlaces(latitude, longitude, radius = 5000) {
    if (!FOURSQUARE_API_KEY) {
        console.warn('Foursquare API key not configured');
        return [];
    }
    
    return new Promise((resolve, reject) => {
        const params = new URLSearchParams({
            ll: `${latitude},${longitude}`,
            radius: radius.toString(),
            categories: WELLNESS_CATEGORIES.join(','),
            limit: '5',
            sort: 'DISTANCE'
        });
        
        const url = `${FOURSQUARE_API_URL}?${params.toString()}`;
        
        const options = {
            method: 'GET',
            headers: {
                'Authorization': FOURSQUARE_API_KEY,
                'Accept': 'application/json'
            },
            timeout: 10000
        };
        
        const parsedUrl = new URL(url);
        options.hostname = parsedUrl.hostname;
        options.path = parsedUrl.pathname + parsedUrl.search;
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    
                    if (res.statusCode === 200 && response.results) {
                        const places = response.results.map(place => ({
                            id: place.fsq_id,
                            name: place.name,
                            category: place.categories?.[0]?.name || 'Wellness Spot',
                            address: formatAddress(place.location),
                            distance: place.distance,
                            location: {
                                lat: place.geocodes?.main?.latitude,
                                lng: place.geocodes?.main?.longitude
                            },
                            googleMapsUrl: generateGoogleMapsUrl(
                                place.geocodes?.main?.latitude,
                                place.geocodes?.main?.longitude,
                                place.name
                            )
                        }));
                        
                        resolve(places);
                    } else {
                        reject(new Error(`Foursquare API error: ${response.message || 'Unknown error'}`));
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse Foursquare response: ${error.message}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(new Error(`Foursquare API request failed: ${error.message}`));
        });
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Foursquare API request timeout'));
        });
        
        req.end();
    });
}

/**
 * Format address from Foursquare location object
 */
function formatAddress(location) {
    if (!location) return 'Address not available';
    
    const parts = [
        location.address,
        location.locality,
        location.region,
        location.postcode
    ].filter(Boolean);
    
    return parts.join(', ') || 'Address not available';
}

/**
 * Generate Google Maps URL
 */
function generateGoogleMapsUrl(lat, lng, name = '') {
    if (!lat || !lng) return '#';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query=${lat},${lng}`;
}

module.exports = {
    searchWellnessPlaces
};