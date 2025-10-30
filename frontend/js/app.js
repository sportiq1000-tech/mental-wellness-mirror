/**
 * Main Application Logic
 */

class MentalWellnessApp {
    constructor() {
        this.currentPage = 'landing';
        this.chatMessages = [];
        
        this.init();
    }
    
    async init() {
        console.log('🧠 Mental Wellness Mirror - Initializing...');
        
        // Check API health
        const apiHealthy = await checkAPIHealth();
        if (!apiHealthy) {
            showToast('Warning: Cannot connect to backend', 'error');
        }
        
        // Setup navigation
        this.setupNavigation();
        
        // Setup chat
        this.setupChat();
        
        // Load initial data
        await this.loadInitialData();
        
        // Setup export button
        this.setupExport();
        
        console.log('✅ Application ready');
    }
    
    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn[data-page]');
        
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                this.navigateToPage(page);
                
                // Update active state
                navButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }
    
    navigateToPage(pageName) {
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => page.classList.remove('active'));
        
        const targetPage = document.getElementById(`${pageName}Page`);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageName;
            
            // Load page-specific data
            if (pageName === 'dashboard') {
                this.loadDashboardData();
            }
        }
    }
    
    setupChat() {
        const chatForm = document.getElementById('chatForm');
        const chatInput = document.getElementById('chatInput');
        const charCount = document.getElementById('charCount');
        const submitBtn = document.getElementById('submitBtn');
        
        // Character counter
        if (chatInput && charCount) {
            chatInput.addEventListener('input', () => {
                const length = chatInput.value.length;
                charCount.textContent = `${length} / 5000`;
                
                if (length >= 5000) {
                    charCount.style.color = 'var(--error-color)';
                } else if (length >= 4500) {
                    charCount.style.color = 'var(--warning-color)';
                } else {
                    charCount.style.color = 'var(--text-tertiary)';
                }
            });
        }
        
        // Form submission
        if (chatForm) {
            chatForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleChatSubmit();
            });
        }
        
        // Prompt suggestions
        const promptButtons = document.querySelectorAll('.prompt-btn');
        promptButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const prompt = btn.dataset.prompt;
                if (chatInput) {
                    chatInput.value = prompt;
                    chatInput.focus();
                    chatInput.dispatchEvent(new Event('input'));
                }
            });
        });
    }
    
    async handleChatSubmit() {
        const chatInput = document.getElementById('chatInput');
        const submitBtn = document.getElementById('submitBtn');
        
        const text = chatInput.value.trim();
        
        // Validation
        if (text.length < 10) {
            showToast('Please write at least 10 characters', 'error');
            return;
        }
        
        if (text.length > 5000) {
            showToast('Message is too long (max 5000 characters)', 'error');
            return;
        }
        
        // Disable input
        chatInput.disabled = true;
        submitBtn.disabled = true;
        showLoading(true);
        
        try {
            // Add user message to chat
            this.addMessageToChat(text, 'user');
            
            // Clear input
            chatInput.value = '';
            chatInput.dispatchEvent(new Event('input'));
            
            // Submit to API
            const response = await submitChatMessage(text, true);
            
            if (response.success && response.data) {
                // Add AI response
                this.addMessageToChat(
                    response.data.aiResponse,
                    'ai',
                    response.data.sentiment,
                    response.data.timestamp,
                    response.data.source  // ✅ NEW: Pass source
                );
                
                // Update stats
                this.updateQuickStats(response.data.stats);
                
                // Update chart if on dashboard
                if (chartManager && this.currentPage === 'dashboard') {
                    chartManager.addDataPoint(
                        response.data.timestamp,
                        response.data.sentiment.score,
                        response.data.sentiment.label
                    );
                }
                
                showToast('Reflection saved successfully', 'success');
            }
            
        } catch (error) {
            console.error('Chat submission error:', error);
            showToast('Failed to process your reflection. Please try again.', 'error');
            
            // Add fallback message
            this.addMessageToChat(
                "I'm having trouble connecting right now. Your thoughts are important - please try again in a moment.",
                'ai'
            );
        } finally {
            chatInput.disabled = false;
            submitBtn.disabled = false;
            showLoading(false);
            chatInput.focus();
        }
    }
    
   addMessageToChat(text, type, sentiment = null, timestamp = null, source = null) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const avatarIcon = type === 'user' ? 'fa-user' : 'fa-robot';
    
    // ✅ NEW: Add source indicator for AI messages
    let sourceIndicator = '';
    if (type === 'ai' && source) {
        if (source === 'groq') {
            sourceIndicator = '<span class="ai-source groq-source" title="Powered by Groq AI"><i class="fas fa-bolt"></i> AI</span>';
        } else if (source === 'fallback') {
            sourceIndicator = '<span class="ai-source fallback-source" title="Fallback response (AI unavailable)"><i class="fas fa-exclamation-triangle"></i> Offline</span>';
        }
    }
    
    let metaHTML = '';
    if (sentiment) {
        metaHTML = `
            <div class="message-meta">
                ${sourceIndicator}
                <span class="sentiment-badge ${sentiment.label.toLowerCase()}">
                    ${sentiment.emoji} ${sentiment.label}
                </span>
                <span class="message-time">${formatTimestamp(timestamp || new Date())}</span>
            </div>
        `;
    }
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas ${avatarIcon}"></i>
        </div>
        <div class="message-content">
            <p>${sanitizeHTML(text)}</p>
            ${metaHTML}
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Store in memory
    this.chatMessages.push({
        text,
        type,
        sentiment,
        timestamp: timestamp || new Date().toISOString(),
        source
    });
}
    
    updateQuickStats(stats) {
        if (!stats) return;
        
        const elements = {
            totalEntries: stats.totalEntries || 0,
            moodStreak: stats.moodStreak || 0,
            positivePercent: stats.totalEntries > 0 
                ? Math.round((stats.weekAverage + 1) * 50) + '%'
                : '0%'
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) {
                // Animate number change
                el.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    el.textContent = value;
                    el.style.transform = 'scale(1)';
                }, 150);
            }
        });
    }
    
    async loadInitialData() {
        try {
            const response = await getRecentMoodData(10);
            
            if (response.success && response.data && response.data.recent) {
                // Update quick stats based on recent data
                const recentData = response.data.recent;
                const positiveCount = recentData.filter(d => d.label === 'Positive').length;
                const positivePercent = recentData.length > 0 
                    ? Math.round((positiveCount / recentData.length) * 100) 
                    : 0;
                
                const totalEntriesEl = document.getElementById('totalEntries');
                const positivePercentEl = document.getElementById('positivePercent');
                
                if (totalEntriesEl) totalEntriesEl.textContent = recentData.length;
                if (positivePercentEl) positivePercentEl.textContent = positivePercent + '%';
            }
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }
    
    async loadDashboardData() {
        if (chartManager) {
            await chartManager.loadMoodData(7);
        }
        
        // Load recent entries
        await this.loadRecentEntries();
    }
    
    async loadRecentEntries() {
        try {
            const response = await getMoodHistory(30);
            
            if (response.success && response.data && response.data.entries) {
                const entriesList = document.getElementById('recentEntriesList');
                if (!entriesList) return;
                
                const entries = response.data.entries.slice(0, 5);
                
                if (entries.length === 0) {
                    entriesList.innerHTML = '<p class="no-data">No reflections yet. Start sharing your thoughts!</p>';
                    return;
                }
                
                entriesList.innerHTML = entries.map(entry => `
                    <div class="entry-card">
                        <div class="entry-header">
                            <span class="sentiment-badge ${entry.sentimentLabel.toLowerCase()}">
                                ${getSentimentEmoji(entry.sentimentScore)} ${entry.sentimentLabel}
                            </span>
                            <span class="entry-date">${formatDate(entry.timestamp)}</span>
                        </div>
                        <p class="entry-text">${sanitizeHTML(entry.snippet)}...</p>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Failed to load recent entries:', error);
        }
    }
    
    setupExport() {
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                try {
                    showLoading(true);
                    await exportData('json', 365);
                    showToast('Journal exported successfully', 'success');
                } catch (error) {
                    showToast('Failed to export data', 'error');
                } finally {
                    showLoading(false);
                }
            });
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new MentalWellnessApp();
    });
} else {
    window.app = new MentalWellnessApp();
}