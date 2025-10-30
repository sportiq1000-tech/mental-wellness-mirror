/**
 * Dashboard Page Logic
 * Mental Wellness Mirror - Dashboard
 * UPDATED: Real user data with authentication
 */

// ============================================
// AUTHENTICATION CHECK (MUST BE FIRST)
// ============================================
if (!window.authManager || !window.authManager.requireAuth()) {
  throw new Error('Authentication required');
}

// ============================================
// SIDEBAR TOGGLE (Mobile)
// ============================================

const toggleSidebarBtn = document.getElementById('toggleSidebar');
const sidebar = document.getElementById('sidebar');

if (toggleSidebarBtn) {
  toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      if (!sidebar.contains(e.target) && !toggleSidebarBtn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    }
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateStreak(entries) {
  if (!entries || entries.length === 0) return 0;
  
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  
  for (const entry of entries) {
    const entryDate = new Date(entry.timestamp).toISOString().split('T')[0];
    if (entryDate === today) {
      streak++;
    }
  }
  
  return streak || 1;
}

function generateWeeklyActivity(entries) {
  const hours = ['12 AM', '3 AM', '6 AM', '9 AM', '12 PM', '3 PM', '6 PM', '9 PM'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Initialize grid
  const activity = hours.map(hour => ({
    hour,
    values: new Array(7).fill(0)
  }));
  
  // Count entries by hour and day
  if (entries && entries.length > 0) {
    entries.forEach(entry => {
      const date = new Date(entry.timestamp);
      const hour = Math.floor(date.getHours() / 3);
      const day = date.getDay();
      
      if (hour >= 0 && hour < 8 && day >= 0 && day < 7) {
        activity[hour].values[day]++;
      }
    });
  }
  
  // Normalize to 0-5 scale
  activity.forEach(row => {
    row.values = row.values.map(val => Math.min(5, val));
  });
  
  return activity;
}

function formatRecentActivity(entries) {
  if (!entries || entries.length === 0) return [];
  
  return entries.slice(0, 8).map(entry => {
    const timestamp = new Date(entry.timestamp);
    const now = new Date();
    const hoursAgo = Math.floor((now - timestamp) / (1000 * 60 * 60));
    
    let timeText;
    if (hoursAgo < 1) {
      timeText = 'Just now';
    } else if (hoursAgo < 24) {
      timeText = `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
    } else {
      const daysAgo = Math.floor(hoursAgo / 24);
      timeText = `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
    }
    
    return {
      type: 'chat',
      icon: '💬',
      title: 'Chat Session',
      description: entry.user_text.substring(0, 50) + '...',
      time: timeText
    };
  });
}

function showLoading() {
  const content = document.querySelector('.dashboard-content');
  if (content) {
    content.style.opacity = '0.5';
    content.style.pointerEvents = 'none';
  }
}

function hideLoading() {
  const content = document.querySelector('.dashboard-content');
  if (content) {
    content.style.opacity = '1';
    content.style.pointerEvents = 'auto';
  }
}

function showError(message) {
  const dashboard = document.querySelector('.dashboard-content');
  if (dashboard) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-banner';
    errorDiv.style.cssText = `
      background: #fee;
      border: 1px solid #fcc;
      color: #c33;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      text-align: center;
    `;
    errorDiv.textContent = message;
    dashboard.insertBefore(errorDiv, dashboard.firstChild);
  }
}

// ============================================
// MOCK DATA GENERATION (Fallback)
// ============================================

function generateMockData(days = 30) {
  const data = {
    totalChats: 0,
    avgMood: 0,
    currentStreak: 0,
    avgSessionTime: 0,
    moodTrend: [],
    activityDistribution: {
      chat: 0,
      mood: 0,
      voice: 0,
      journaling: 0
    },
    weeklyActivity: [],
    recentActivity: []
  };

  // Generate mood trend data
  let moodSum = 0;
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const mood = 3 + Math.random() * 2;
    
    data.moodTrend.push({
      date: date.toISOString().split('T')[0],
      avg_score: mood / 5,
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    });
    
    moodSum += mood;
  }

  data.totalChats = Math.floor(Math.random() * 50) + 30;
  data.avgMood = (moodSum / days / 5).toFixed(2);
  data.currentStreak = Math.floor(Math.random() * 15) + 3;
  data.avgSessionTime = Math.floor(Math.random() * 20) + 10;

  data.activityDistribution = {
    chat: data.totalChats,
    mood: Math.floor(Math.random() * 40) + 20,
    voice: Math.floor(Math.random() * 20) + 5,
    journaling: Math.floor(Math.random() * 30) + 10
  };

  const hours = ['12 AM', '3 AM', '6 AM', '9 AM', '12 PM', '3 PM', '6 PM', '9 PM'];
  data.weeklyActivity = hours.map(hour => ({
    hour,
    values: Array(7).fill(0).map(() => Math.floor(Math.random() * 6))
  }));

  data.recentActivity = [];

  return data;
}

// ============================================
// POPULATE METRICS
// ============================================

function populateMetrics(data) {
  // Total Chats
  const totalChatsEl = document.getElementById('totalChats');
  const chatsChangeEl = document.getElementById('chatsChange');
  
  if (totalChatsEl) totalChatsEl.textContent = data.totalChats;
  if (chatsChangeEl) chatsChangeEl.textContent = `+${Math.floor(data.totalChats * 0.15)} (15%)`;

  // Average Mood
  const avgMoodEl = document.getElementById('avgMood');
  const moodChangeEl = document.getElementById('moodChange');
  
  if (avgMoodEl) {
    const moodEmojis = ['😢', '😕', '😐', '😊', '😄'];
    const moodScore = data.avgMood * 5;
    const moodIndex = Math.min(Math.floor(moodScore), 4);
    avgMoodEl.textContent = `${moodScore.toFixed(1)} ${moodEmojis[moodIndex]}`;
  }
  if (moodChangeEl) moodChangeEl.textContent = 'Stable this period';

  // Current Streak
  const streakEl = document.getElementById('currentStreak');
  const streakInfoEl = document.getElementById('streakInfo');
  
  if (streakEl) streakEl.textContent = `${data.currentStreak} days`;
  if (streakInfoEl) streakInfoEl.textContent = 'Keep it up!';

  // Avg Session Time
  const sessionEl = document.getElementById('avgSession');
  const sessionChangeEl = document.getElementById('sessionChange');
  
  if (sessionEl) sessionEl.textContent = `${data.avgSessionTime} min`;
  if (sessionChangeEl) sessionChangeEl.textContent = 'Avg. across all sessions';
}

// ============================================
// CREATE CHARTS
// ============================================

function createMoodTrendChart(data) {
  const ctx = document.getElementById('moodTrendChart');
  if (!ctx) return;
  
  const labels = data.moodTrend.map(d => d.label || d.date);
  const scores = data.moodTrend.map(d => (d.avg_score || 0) * 5);
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Mood Score',
        data: scores,
        borderColor: '#2196f3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `Mood: ${context.parsed.y.toFixed(1)}/5`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 0,
          max: 5,
          ticks: { stepSize: 1 },
          grid: { color: 'rgba(0, 0, 0, 0.05)' }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

function createActivityChart(data) {
  const ctx = document.getElementById('activityChart');
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Chat Sessions', 'Mood Logs', 'Voice Notes', 'Journaling'],
      datasets: [{
        data: [
          data.activityDistribution.chat,
          data.activityDistribution.mood,
          data.activityDistribution.voice,
          data.activityDistribution.journaling
        ],
        backgroundColor: ['#2196f3', '#4caf50', '#ff9800', '#9c27b0'],
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
            usePointStyle: true
          }
        }
      }
    }
  });
}

// ============================================
// CREATE HEATMAP
// ============================================

function createActivityHeatmap(data) {
  const container = document.getElementById('activityHeatmap');
  if (!container) return;
  
  container.innerHTML = '';
  
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const headerRow = document.createElement('div');
  headerRow.style.gridColumn = '1 / -1';
  headerRow.style.display = 'grid';
  headerRow.style.gridTemplateColumns = 'auto repeat(7, 1fr)';
  headerRow.style.gap = '4px';
  headerRow.style.marginBottom = '8px';
  
  const emptyCell = document.createElement('div');
  headerRow.appendChild(emptyCell);
  
  days.forEach(day => {
    const dayLabel = document.createElement('div');
    dayLabel.className = 'heatmap-label';
    dayLabel.textContent = day;
    dayLabel.style.justifyContent = 'center';
    headerRow.appendChild(dayLabel);
  });
  
  container.appendChild(headerRow);
  
  data.weeklyActivity.forEach(row => {
    const label = document.createElement('div');
    label.className = 'heatmap-label';
    label.textContent = row.hour;
    container.appendChild(label);
    
    row.values.forEach(value => {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      cell.setAttribute('data-level', value);
      cell.title = `Activity level: ${value}/5`;
      container.appendChild(cell);
    });
  });
}

// ============================================
// POPULATE RECENT ACTIVITY
// ============================================

function populateRecentActivity(data) {
  const container = document.getElementById('recentActivityList');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!data.recentActivity || data.recentActivity.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">No recent activity</p>';
    return;
  }
  
  data.recentActivity.forEach(activity => {
    const item = document.createElement('div');
    item.className = 'activity-item';
    
    item.innerHTML = `
      <div class="activity-icon">${activity.icon}</div>
      <div class="activity-details">
        <h4 class="activity-title">${activity.title}</h4>
        <p class="activity-description">${activity.description}</p>
      </div>
      <div class="activity-time">${activity.time}</div>
    `;
    
    container.appendChild(item);
  });
}

// ============================================
// TIME RANGE CHANGE
// ============================================

async function handleTimeRangeChange(days) {
  console.log(`Loading data for last ${days} days...`);
  
  try {
    showLoading();
    
    const moodStatsResponse = await window.api.getMoodStats(days);
    const chatHistoryResponse = await window.api.getChatHistory(50, 0);
    
    const newData = {
      totalChats: chatHistoryResponse.data.entries?.length || 0,
      avgMood: moodStatsResponse.data.overall?.averageScore || 0,
      currentStreak: calculateStreak(chatHistoryResponse.data.entries),
      avgSessionTime: 15,
      moodTrend: moodStatsResponse.data.daily || [],
      activityDistribution: {
        chat: chatHistoryResponse.data.entries?.length || 0,
        mood: moodStatsResponse.data.overall?.totalEntries || 0,
        voice: 0,
        journaling: 0
      },
      weeklyActivity: generateWeeklyActivity(chatHistoryResponse.data.entries),
      recentActivity: formatRecentActivity(chatHistoryResponse.data.entries)
    };
    
    populateMetrics(newData);
    
    hideLoading();
  } catch (error) {
    console.error('Error updating dashboard:', error);
    hideLoading();
    showError('Failed to update data');
  }
}

// ============================================
// INITIALIZE DASHBOARD
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Dashboard initializing...');
  
  // Load user info
  const currentUser = window.authManager.getCurrentUser();
  if (currentUser) {
    console.log('✅ Dashboard loaded for user:', currentUser.email);
    
    const userName = document.querySelector('.user-name');
    const userEmail = document.querySelector('.user-email');
    
    if (userName) userName.textContent = currentUser.fullName || currentUser.username || 'User';
    if (userEmail) userEmail.textContent = currentUser.email;
  }
  
  try {
    showLoading();
    
    // Fetch real data from API
    const statsResponse = await window.api.getUserStats();
    const moodStatsResponse = await window.api.getMoodStats(30);
    const chatHistoryResponse = await window.api.getChatHistory(50, 0);
    
    const dashboardData = {
      totalChats: statsResponse.data.stats.totalEntries || 0,
      avgMood: moodStatsResponse.data.overall?.averageScore || 0,
      currentStreak: calculateStreak(chatHistoryResponse.data.entries),
      avgSessionTime: 15,
      moodTrend: moodStatsResponse.data.daily || [],
      activityDistribution: {
        chat: statsResponse.data.stats.totalEntries || 0,
        mood: moodStatsResponse.data.overall?.totalEntries || 0,
        voice: 0,
        journaling: 0
      },
      weeklyActivity: generateWeeklyActivity(chatHistoryResponse.data.entries),
      recentActivity: formatRecentActivity(chatHistoryResponse.data.entries)
    };
    
    hideLoading();
    
    populateMetrics(dashboardData);
    createMoodTrendChart(dashboardData);
    createActivityChart(dashboardData);
    createActivityHeatmap(dashboardData);
    populateRecentActivity(dashboardData);
    
    console.log('✅ Dashboard loaded successfully');
    
  } catch (error) {
    console.error('❌ Error loading dashboard:', error);
    hideLoading();
    
    // Fallback to mock data
    console.log('Using mock data as fallback');
    const mockData = generateMockData(30);
    populateMetrics(mockData);
    createMoodTrendChart(mockData);
    createActivityChart(mockData);
    createActivityHeatmap(mockData);
    
    if (error.statusCode === 401) {
      showError('Session expired. Redirecting to login...');
      setTimeout(() => window.location.href = '/pages/login.html', 2000);
    } else {
      showError('Some data may be unavailable. Showing sample data.');
    }
  }
  
  // Time range selector
  const timeRangeSelect = document.getElementById('timeRange');
  if (timeRangeSelect) {
    timeRangeSelect.addEventListener('change', (e) => {
      const days = parseInt(e.target.value);
      handleTimeRangeChange(days);
    });
  }
});