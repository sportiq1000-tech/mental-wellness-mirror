/**
 * Dashboard Page Logic
 * UPDATED: Real user data, no mock data, improved calculations
 */

// ============================================
// AUTHENTICATION CHECK
// ============================================
if (!window.authManager || !window.authManager.requireAuth()) {
  throw new Error('Authentication required');
}

// ============================================
// DOMCONTENTLOADED - MAIN EXECUTION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Dashboard initializing...');
  
  // Setup UI elements and listeners
  setupUI();
  
  // Load initial dashboard data for 30 days
  await loadDashboardData(30);
});

// ============================================
// SETUP UI & LISTENERS
// ============================================
function setupUI() {
  // Sidebar toggle
  const toggleSidebarBtn = document.getElementById('toggleSidebar');
  const sidebar = document.getElementById('sidebar');
  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !toggleSidebarBtn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  // Time range selector
  const timeRangeSelect = document.getElementById('timeRange');
  if (timeRangeSelect) {
    timeRangeSelect.addEventListener('change', (e) => {
      const days = parseInt(e.target.value);
      loadDashboardData(days);
    });
  }
}

// ============================================
// DATA LOADING
// ============================================
async function loadDashboardData(days = 30) {
  showLoading();
  try {
    // Fetch all necessary data in parallel
    const [statsResponse, moodStatsResponse, chatHistoryResponse] = await Promise.all([
      window.api.getUserStats(),
      window.api.getMoodStats(days),
      window.api.getChatHistory(100, 0) // Fetch recent history for activity
    ]);

    // Process data for the dashboard
    const dashboardData = processApiData(statsResponse, moodStatsResponse, chatHistoryResponse);
    
    // Render all components with real data
    renderDashboard(dashboardData);
    
    console.log('✅ Dashboard loaded successfully with real data');

  } catch (error) {
    console.error('❌ Error loading dashboard:', error);
    showError('Failed to load dashboard data. Please refresh.');
  } finally {
    hideLoading();
  }
}

// ============================================
// DATA PROCESSING
// ============================================
function processApiData(statsRes, moodRes, chatRes) {
  const userStats = statsRes.data.stats;
  const moodStats = moodRes.data.overall;
  const moodTrends = moodRes.data.daily;
  const chatHistory = chatRes.data.entries;

  return {
    totalChats: userStats.totalEntries || 0,
    avgMood: moodStats.averageScore || 0,
    todaysEntries: calculateTodaysEntries(chatHistory),
    avgSessionTime: Math.round(userStats.averageSessionTime) || 15, // Placeholder
    moodTrend: moodTrends || [],
    activityDistribution: {
      chat: userStats.totalEntries || 0,
      mood: moodStats.totalEntries || 0
    },
    weeklyActivity: generateWeeklyActivity(chatHistory),
    recentActivity: formatRecentActivity(chatHistory),
    insights: generateInsights(moodTrends)
  };
}

// ============================================
// COMPONENT RENDERING
// ============================================
function renderDashboard(data) {
  
  populateMetrics(data);
  createMoodTrendChart(data.moodTrend);
  createActivityChart(data.activityDistribution);
  createActivityHeatmap(data.weeklyActivity);
  populateRecentActivity(data.recentActivity);
  populateInsights(data.insights);
}

function populateMetrics(data) {
  document.getElementById('totalChats').textContent = data.totalChats;
  
  const moodScore = data.avgMood * 5; // Scale to 1-5
  const moodEmojis = ['😢', '😕', '😐', '😊', '😄'];
  const moodIndex = Math.min(Math.floor(moodScore), 4);
  document.getElementById('avgMood').textContent = `${moodScore.toFixed(1)} / 5 ${moodEmojis[moodIndex]}`;
  
  document.getElementById('currentStreak').textContent = data.todaysEntries;
  document.getElementById('avgSession').textContent = `${data.avgSessionTime} min`;
}

function createMoodTrendChart(trends) {
  const ctx = document.getElementById('moodTrendChart')?.getContext('2d');
  if (!ctx) return;
  
  if (window.moodChartInstance) window.moodChartInstance.destroy();
  
  const labels = trends.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const scores = trends.map(d => (d.avg_score || 0) * 5);
  
  window.moodChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Mood Score', data: scores,
        borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `Mood: ${c.parsed.y.toFixed(1)}/5` }}},
      scales: {
        y: { min: 0, max: 5, ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' }},
        x: { grid: { display: false }}
      }
    }
  });
}

function createActivityChart(distribution) {
  const ctx = document.getElementById('activityChart')?.getContext('2d');
  if (!ctx) return;

  if (window.activityChartInstance) window.activityChartInstance.destroy();

  window.activityChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Chat Sessions', 'Mood Logs'],
      datasets: [{
        data: [distribution.chat, distribution.mood],
        backgroundColor: ['#6366f1', '#10b981'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { padding: 15, usePointStyle: true }}}
    }
  });
}

function createActivityHeatmap(activity) {
  const container = document.getElementById('activityHeatmap');
  if (!container) return;
  container.innerHTML = '';
  
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const headerRow = document.createElement('div');
  headerRow.style.cssText = 'grid-column: 1 / -1; display: grid; grid-template-columns: auto repeat(7, 1fr); gap: 4px; margin-bottom: 8px;';
  headerRow.appendChild(document.createElement('div'));
  days.forEach(day => {
    const label = document.createElement('div');
    label.className = 'heatmap-label';
    label.textContent = day;
    label.style.justifyContent = 'center';
    headerRow.appendChild(label);
  });
  container.appendChild(headerRow);
  
  activity.forEach(row => {
    const label = document.createElement('div');
    label.className = 'heatmap-label';
    label.textContent = row.hour;
    container.appendChild(label);
    row.values.forEach(value => {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      cell.setAttribute('data-level', value);
      cell.title = `Activity level: ${value}`;
      container.appendChild(cell);
    });
  });
}

function populateRecentActivity(activity) {
  const container = document.getElementById('recentActivityList');
  if (!container) return;
  container.innerHTML = '';
  
  if (activity.length === 0) {
    container.innerHTML = '<p class="text-center text-muted p-4">No recent activity</p>';
    return;
  }
  
  activity.slice(0, 5).forEach(act => {
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `
      <div class="activity-icon"><i class="fas fa-comment"></i></div>
      <div class="activity-details">
        <h4 class="activity-title">${act.title}</h4>
        <p class="activity-description">${escapeHtml(act.description)}</p>
      </div>
      <div class="activity-time">${act.time}</div>
    `;
    container.appendChild(item);
  });
}

function populateInsights(insights) {
  const container = document.getElementById('insightsGrid');
  if (!container) return;
  container.innerHTML = '';

  if (insights.length === 0) {
    container.innerHTML = '<p class="text-center text-muted p-4">Not enough data for insights yet.</p>';
    return;
  }

  insights.forEach(insight => {
    const insightCard = document.createElement('div');
    insightCard.className = `insight-card insight-${insight.type}`;
    insightCard.innerHTML = `
      <div class="insight-icon">${insight.icon}</div>
      <div class="insight-content">
        <h4 class="insight-title">${insight.title}</h4>
        <p class="insight-description">${insight.description}</p>
      </div>
    `;
    container.appendChild(insightCard);
  });
}

// ============================================
// DATA CALCULATION & FORMATTING HELPERS
// ============================================
function calculateTodaysEntries(entries) {
  if (!entries) return 0;
  const today = new Date().toISOString().split('T')[0];
  return entries.filter(e => e.timestamp.startsWith(today)).length;
}

function generateWeeklyActivity(entries) {
  const activity = Array(8).fill(0).map(() => Array(7).fill(0));
  if (entries) {
    entries.forEach(entry => {
      const date = new Date(entry.timestamp);
      const hourIndex = Math.floor(date.getHours() / 3);
      const dayIndex = date.getDay();
      if (hourIndex < 8 && dayIndex < 7) {
        activity[hourIndex][dayIndex]++;
      }
    });
  }
  return activity.map((values, i) => ({
    hour: `${i*3}:00`,
    values: values.map(val => Math.min(5, val))
  }));
}

function formatRecentActivity(entries) {
  if (!entries) return [];
  return entries.slice(0, 5).map(entry => {
    const hoursAgo = Math.floor((new Date() - new Date(entry.timestamp)) / 3600000);
    return {
      title: 'Chat Session',
      description: entry.user_text.substring(0, 50) + '...',
      time: hoursAgo < 1 ? 'Just now' : `${hoursAgo}h ago`
    };
  });
}

function generateInsights(moodTrends) {
  const insights = [];
  if (moodTrends.length < 7) return insights;

  const last7Days = moodTrends.slice(-7);
  const avgMood = last7Days.reduce((sum, d) => sum + d.avg_score, 0) / last7Days.length;

  if (avgMood > 0.7) {
    insights.push({ type: 'positive', icon: '✨', title: 'Great Week!', description: 'Your average mood has been consistently positive. Keep up the great work!' });
  }

  const moodVariance = last7Days.map(d => d.avg_score).reduce((sum, score) => sum + Math.pow(score - avgMood, 2), 0) / last7Days.length;
  if (moodVariance > 0.1) {
    insights.push({ type: 'warning', icon: '⚠️', title: 'Mood Fluctuations', description: 'Your mood has seen some significant ups and downs this week. Consider exploring what might be causing these shifts.' });
  } else {
    insights.push({ type: 'neutral', icon: '💡', title: 'Mood Stability', description: 'Your mood has been relatively stable this week, which is a good sign of emotional regulation.' });
  }

  return insights;
}

function showLoading() {
  const content = document.querySelector('.dashboard-content');
  if (content) content.style.opacity = '0.5';
}

function hideLoading() {
  const content = document.querySelector('.dashboard-content');
  if (content) content.style.opacity = '1';
}

function showError(message) {
  // Simple alert for now
  console.error('Dashboard Error:', message);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}