/**
 * Dark Mode Toggle Logic
 */

class DarkModeManager {
    constructor() {
        this.themeToggleBtn = document.getElementById('themeToggle');
        this.body = document.body;
        this.currentTheme = this.loadTheme();
        
        this.init();
    }
    
    init() {
        // Apply saved theme
        this.applyTheme(this.currentTheme);
        
        // Add event listener
        if (this.themeToggleBtn) {
            this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        }
        
        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!storage.get('themePreference')) {
                    this.applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }
    
    loadTheme() {
        const savedTheme = storage.get('themePreference');
        if (savedTheme) {
            return savedTheme;
        }
        
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        
        return 'light';
    }
    
    applyTheme(theme) {
        if (theme === 'dark') {
            this.body.classList.remove('light-theme');
            this.body.classList.add('dark-theme');
        } else {
            this.body.classList.remove('dark-theme');
            this.body.classList.add('light-theme');
        }
        
        this.currentTheme = theme;
        this.updateToggleIcon();
    }
    
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        storage.set('themePreference', newTheme);
        
        // Show toast
        showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode activated`, 'success');
    }
    
    updateToggleIcon() {
        if (this.themeToggleBtn) {
            const icon = this.themeToggleBtn.querySelector('i');
            if (icon) {
                icon.className = this.currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
    }
}

// Initialize dark mode when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.darkModeManager = new DarkModeManager();
    });
} else {
    window.darkModeManager = new DarkModeManager();
}