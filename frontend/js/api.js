/**
 * API Communication Layer
 */

const API_BASE_URL = window.location.origin;

// API call wrapper with error handling
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(url, mergedOptions);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || 'API request failed');
        }
        
        return data;
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        throw error;
    }
}

// Submit chat message
async function submitChatMessage(text, includeContext = true) {
    return apiCall('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ text, includeContext })
    });
}

// Get mood history
async function getMoodHistory(days = 7) {
    return apiCall(`/api/moods/history?days=${days}`);
}

// Get recent mood data
async function getRecentMoodData(limit = 10) {
    return apiCall(`/api/moods/recent?limit=${limit}`);
}

// Export data
async function exportData(format = 'json', days = 365) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/moods/export?format=${format}&days=${days}`);
        
        if (!response.ok) {
            throw new Error('Export failed');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wellness-journal-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        return { success: true };
    } catch (error) {
        console.error('Export error:', error);
        throw error;
    }
}

// Get wellness places (placeholder for Phase 3)
async function getWellnessPlaces(latitude, longitude) {
    return apiCall(`/api/places?lat=${latitude}&lng=${longitude}`);
}

// Play voice (placeholder for Phase 3)
async function playVoice(text) {
    return apiCall('/api/voice', {
        method: 'POST',
        body: JSON.stringify({ text })
    });
}

// Export API functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        submitChatMessage,
        getMoodHistory,
        getRecentMoodData,
        exportData,
        getWellnessPlaces,
        playVoice
    };
}