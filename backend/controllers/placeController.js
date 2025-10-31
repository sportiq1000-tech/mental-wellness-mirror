/**
 * Place Controller
 * Using Geoapify API for place searches
 */

const { searchGeoapifyPlaces } = require('../services/geoapifyService');
const { catchAsync } = require('../middleware/errorHandler');
const { ValidationError } = require('../utils/errorTypes');
const { validateCoordinates } = require('../utils/validators');

/**
 * Find nearby peaceful places
 * GET /api/places/nearby
 * Query params: lat, lng, category (optional)
 */
const findNearbyPlaces = catchAsync(async (req, res) => {
  const { lat, lng, category = 'parks' } = req.query;

  console.log('🔍 Query Params:', { lat, lng, category });

  // Validate coordinates
  const validation = validateCoordinates(lat, lng);
  if (!validation.valid) {
    throw new ValidationError('Invalid location coordinates', validation.errors.join(', '));
  }
  
  const { lat: latitude, lng: longitude } = validation.coordinates;
  console.log(`✅ Validated Coords: ${latitude}, ${longitude}`);

  // Search places using Geoapify
  const places = await searchGeoapifyPlaces(latitude, longitude, category);
  
  res.json({
    success: true,
    message: `Found ${places.length} ${category} nearby.`,
    data: {
      places,
      query: {
        lat: latitude,
        lng: longitude,
        category,
        count: places.length
      }
    }
  });
});

module.exports = {
  findNearbyPlaces
};