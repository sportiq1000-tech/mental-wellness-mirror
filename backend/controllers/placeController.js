/**
 * Places Controller - Wellness Location Suggestions
 */

const { searchWellnessPlaces } = require('../services/foursquareService');
const { validateCoordinates } = require('../utils/validators');

/**
 * Get nearby wellness places
 */
async function getNearbyWellnessPlaces(req, res) {
    try {
        const { lat, lng, radius = 5000 } = req.query;
        
        // Validate coordinates
        const validation = validateCoordinates(lat, lng);
        
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_COORDINATES',
                    message: 'Invalid location coordinates',
                    details: validation.errors.join(', ')
                }
            });
        }
        
        const { lat: latitude, lng: longitude } = validation.coordinates;
        
        // Search for wellness places
        const places = await searchWellnessPlaces(latitude, longitude, radius);
        
        res.json({
            success: true,
            data: {
                places,
                userLocation: {
                    lat: latitude,
                    lng: longitude
                }
            }
        });
        
    } catch (error) {
        console.error('Places search error:', error);
        
        // Return fallback wellness tips
        res.json({
            success: true,
            data: {
                places: [],
                fallbackTips: [
                    'Take a short walk outside',
                    'Practice deep breathing for 5 minutes',
                    'Find a quiet spot to meditate',
                    'Visit a nearby park or green space',
                    'Call a friend or loved one'
                ],
                message: 'Location services unavailable. Here are some wellness tips.'
            }
        });
    }
}

module.exports = {
    getNearbyWellnessPlaces
};