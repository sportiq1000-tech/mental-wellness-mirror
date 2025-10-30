/**
 * Utility Functions
 */

// Format timestamp to readable date/time
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

// Format date for display
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Sanitize HTML to prevent XSS
function sanitizeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show toast notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${sanitizeHTML(message)}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Show loading overlay
function showLoading(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Get sentiment emoji
function getSentimentEmoji(score) {
    if (score >= 0.05) return '😊';
    if (score <= -0.05) return '😔';
    return '😐';
}

// Get sentiment label
function getSentimentLabel(score) {
    if (score >= 0.05) return 'Positive';
    if (score <= -0.05) return 'Negative';
    return 'Neutral';
}

// Get sentiment color
function getSentimentColor(label) {
    const colors = {
        'Positive': '#10b981',
        'Neutral': '#64748b',
        'Negative': '#ef4444'
    };
    return colors[label] || colors['Neutral'];
}

// Truncate text
function truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Check if API is available
async function checkAPIHealth() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('API health check failed:', error);
        return false;
    }
}

// Local storage helpers
const storage = {
    get: (key) => {
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch {
            return null;
        }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    },
    remove: (key) => {
        localStorage.removeItem(key);
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatTimestamp,
        formatDate,
        sanitizeHTML,
        showToast,
        showLoading,
        debounce,
        getSentimentEmoji,
        getSentimentLabel,
        getSentimentColor,
        truncateText,
        checkAPIHealth,
        storage
    };
}