/**
 * Input Validation Utilities
 */

/**
 * Validate text input for chat
 */
function validateChatText(text) {
    const errors = [];
    
    if (!text || typeof text !== 'string') {
        errors.push('Text must be a non-empty string');
        return { valid: false, errors };
    }
    
    const trimmedText = text.trim();
    
    if (trimmedText.length < 10) {
        errors.push('Text must be at least 10 characters long');
    }
    
    if (trimmedText.length > 5000) {
        errors.push('Text must not exceed 5000 characters');
    }
    
    // Check for potentially harmful content (basic XSS prevention)
    const dangerousPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
    ];
    
    for (const pattern of dangerousPatterns) {
        if (pattern.test(trimmedText)) {
            errors.push('Text contains potentially unsafe content');
            break;
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
        sanitized: trimmedText
    };
}

/**
 * Validate date range parameter
 */
function validateDaysParameter(days) {
    const parsedDays = parseInt(days);
    
    if (isNaN(parsedDays)) {
        return { valid: false, error: 'Days must be a number' };
    }
    
    if (parsedDays < 1 || parsedDays > 365) {
        return { valid: false, error: 'Days must be between 1 and 365' };
    }
    
    return { valid: true, value: parsedDays };
}

/**
 * Validate coordinates for location search
 */
function validateCoordinates(lat, lng) {
    const errors = [];
    
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        errors.push('Invalid latitude (must be between -90 and 90)');
    }
    
    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        errors.push('Invalid longitude (must be between -180 and 180)');
    }
    
    return {
        valid: errors.length === 0,
        errors,
        coordinates: { lat: latitude, lng: longitude }
    };
}

/**
 * Sanitize text for safe output
 */
function sanitizeText(text) {
    if (typeof text !== 'string') return '';
    
    return text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

module.exports = {
    validateChatText,
    validateDaysParameter,
    validateCoordinates,
    sanitizeText
};