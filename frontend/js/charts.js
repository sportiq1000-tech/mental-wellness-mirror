/**
 * Chart.js Configuration and Management
 */

class ChartManager {
    constructor() {
        this.moodTimelineChart = null;
        this.emotionPieChart = null;
        this.currentDays = 7;
        
        this.init();
    }
    
    init() {
        // Initialize charts when on dashboard
        if (document.getElementById('moodTimelineChart')) {
            this.initMoodTimelineChart();
            this.initEmotionPieChart();
            this.setupTimeRangeButtons();
        }
    }
    
    initMoodTimelineChart() {
        const ctx = document.getElementById('moodTimelineChart');
        if (!ctx) return;
        
        this.moodTimelineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Sentiment Score',
                    data: [],
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#6366f1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => {
                                const score = context.parsed.y;
                                const label = getSentimentLabel(score);
                                return `${label}: ${score.toFixed(3)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        min: -1,
                        max: 1,
                        ticks: {
                            callback: (value) => value.toFixed(1)
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    }
    
    initEmotionPieChart() {
        const ctx = document.getElementById('emotionPieChart');
        if (!ctx) return;
        
        this.emotionPieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Positive', 'Neutral', 'Negative'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: [
                        '#10b981',
                        '#64748b',
                        '#ef4444'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8
                    }
                },
                cutout: '60%'
            }
        });
    }
    
    setupTimeRangeButtons() {
        const buttons = document.querySelectorAll('.time-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const days = parseInt(btn.dataset.days);
                this.updateTimeRange(days);
                
                // Update active state
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }
    
    async updateTimeRange(days) {
        this.currentDays = days;
        await this.loadMoodData(days);
    }
    
    async loadMoodData(days = 7) {
        try {
            const response = await getMoodHistory(days);
            
            if (response.success && response.data) {
                this.updateMoodTimelineChart(response.data.entries);
                this.updateEmotionPieChart(response.data.statistics);
                this.updateDashboardStats(response.data.statistics);
            }
        } catch (error) {
            console.error('Failed to load mood data:', error);
            showToast('Failed to load mood data', 'error');
        }
    }
    
    updateMoodTimelineChart(entries) {
        if (!this.moodTimelineChart || !entries) return;
        
        const labels = entries.map(e => {
            const date = new Date(e.timestamp);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        
        const data = entries.map(e => e.sentimentScore);
        
        // Update point colors based on sentiment
        const pointColors = entries.map(e => getSentimentColor(e.sentimentLabel));
        
        this.moodTimelineChart.data.labels = labels;
        this.moodTimelineChart.data.datasets[0].data = data;
        this.moodTimelineChart.data.datasets[0].pointBackgroundColor = pointColors;
        this.moodTimelineChart.data.datasets[0].pointBorderColor = pointColors;
        
        this.moodTimelineChart.update();
    }
    
    updateEmotionPieChart(statistics) {
        if (!this.emotionPieChart || !statistics) return;
        
        this.emotionPieChart.data.datasets[0].data = [
            statistics.positiveCount || 0,
            statistics.neutralCount || 0,
            statistics.negativeCount || 0
        ];
        
        this.emotionPieChart.update();
    }
    
    updateDashboardStats(statistics) {
        if (!statistics) return;
        
        const elements = {
            dashPositiveCount: statistics.positiveCount || 0,
            dashNeutralCount: statistics.neutralCount || 0,
            dashNegativeCount: statistics.negativeCount || 0,
            dashAverageMood: (statistics.averageScore || 0).toFixed(3)
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });
    }
    
    addDataPoint(timestamp, score, label) {
        if (!this.moodTimelineChart) return;
        
        const date = new Date(timestamp);
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        this.moodTimelineChart.data.labels.push(formattedDate);
        this.moodTimelineChart.data.datasets[0].data.push(score);
        
        // Keep only last 30 data points
        if (this.moodTimelineChart.data.labels.length > 30) {
            this.moodTimelineChart.data.labels.shift();
            this.moodTimelineChart.data.datasets[0].data.shift();
        }
        
        this.moodTimelineChart.update();
    }
}

// Initialize chart manager
let chartManager;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        chartManager = new ChartManager();
    });
} else {
    chartManager = new ChartManager();
}