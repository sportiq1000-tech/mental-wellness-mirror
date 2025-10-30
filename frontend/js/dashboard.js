/**
 * Dashboard Page Logic
 * Mental Wellness Mirror - Dashboard
 */

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
// MOCK DATA GENERATION
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
    const mood = 3 + Math.random() * 2; // Random mood between 3-5
    
    data.moodTrend.push({
      date: date.toISOString().split('T')[0],
      mood: parseFloat(mood.toFixed(1)),
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    });
    
    moodSum += mood;
  }

  // Calculate metrics
  data.totalChats = Math.floor(Math.random() * 50) + 30;
  data.avgMood = (moodSum / days).toFixed(1);
  data.currentStreak = Math.floor(Math.random() * 15) + 3;
  data.avgSessionTime = Math.floor(Math.random() * 20) + 10; // 10-30 minutes

  // Activity distribution
  data.activityDistribution = {
    chat: Math.floor(Math.random() * 50) + 30,
    mood: Math.floor(Math.random() * 40) + 20,
    voice: Math.floor(Math.random() * 20) + 5,
    journaling: Math.floor(Math.random() * 30) + 10
  };

  // Weekly activity heatmap
  const hours = ['12 AM', '3 AM', '6 AM', '9 AM', '12 PM', '3 PM', '6 PM', '9 PM'];
  const days_week = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  data.weeklyActivity = hours.map(hour => ({
    hour,
    values: days_week.map(() => Math.floor(Math.random() * 6))
  }));

  // Recent activity
  const activities = [
    { type: 'chat', icon: '💬', title: 'Chat Session', description: 'Discussed anxiety management strategies' },
    { type: 'mood', icon: '😊', title: 'Mood Check-in', description: 'Logged mood: Calm (4/5)' },
    { type: 'voice', icon: '🎤', title: 'Voice Note', description: 'Recorded 3-minute reflection' },
    { type: 'insight', icon: '💡', title: 'Insight Received', description: 'Pattern detected in sleep and mood' }
  ];

  for (let i = 0; i < 8; i++) {
    const activity = activities[Math.floor(Math.random() * activities.length)];
    const hoursAgo = Math.floor(Math.random() * 48) + 1;
    
    data.recentActivity.push({
      ...activity,
      time: hoursAgo < 24 ? `${hoursAgo} hours ago` : `${Math.floor(hoursAgo / 24)} days ago`
    });
  }

  return data;
}

// ============================================
// POPULATE METRICS
// ============================================

function populateMetrics(data) {
  // Total Chats
  document.getElementById('totalChats').textContent = data.totalChats;
  document.getElementById('chatsChange').textContent = `+${Math.floor(data.totalChats * 0.15)} (15%)`;

  // Average Mood
  const moodEmojis = ['😢', '😕', '😐', '😊', '😄'];
  const moodIndex = Math.min(Math.floor(data.avgMood) - 1, 4);
  document.getElementById('avgMood').textContent = `${data.avgMood} ${moodEmojis[moodIndex]}`;
  document.getElementById('moodChange').textContent = 'Stable this period';

  // Current Streak
  document.getElementById('currentStreak').textContent = `${data.currentStreak} days`;
  document.getElementById('streakInfo').textContent = 'Keep it up!';

  // Avg Session Time
  document.getElementById('avgSession').textContent = `${data.avgSessionTime} min`;
  document.getElementById('sessionChange').textContent = 'Avg. across all sessions';
}

// ============================================
// CREATE CHARTS
// ============================================

function createMoodTrendChart(data) {
  const ctx = document.getElementById('moodTrendChart').getContext('2d');
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.moodTrend.map(d => d.label),
      datasets: [{
        label: 'Mood Score',
        data: data.moodTrend.map(d => d.mood),
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
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => `Mood: ${context.parsed.y}/5`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 0,
          max: 5,
          ticks: {
            stepSize: 1
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

function createActivityChart(data) {
  const ctx = document.getElementById('activityChart').getContext('2d');
  
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
        backgroundColor: [
          '#2196f3',
          '#4caf50',
          '#ff9800',
          '#9c27b0'
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
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Create header row
  const headerRow = document.createElement('div');
  headerRow.style.gridColumn = '1 / -1';
  headerRow.style.display = 'grid';
  headerRow.style.gridTemplateColumns = 'auto repeat(7, 1fr)';
  headerRow.style.gap = '4px';
  headerRow.style.marginBottom = '8px';
  
  // Empty cell for alignment
  const emptyCell = document.createElement('div');
  headerRow.appendChild(emptyCell);
  
  // Day headers
  days.forEach(day => {
    const dayLabel = document.createElement('div');
    dayLabel.className = 'heatmap-label';
    dayLabel.textContent = day;
    dayLabel.style.justifyContent = 'center';
    headerRow.appendChild(dayLabel);
  });
  
  container.appendChild(headerRow);
  
  // Create rows
  data.weeklyActivity.forEach(row => {
    // Hour label
    const label = document.createElement('div');
    label.className = 'heatmap-label';
    label.textContent = row.hour;
    container.appendChild(label);
    
    // Activity cells
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

document.getElementById('timeRange').addEventListener('change', (e) => {
  const days = parseInt(e.target.value);
  console.log(`Loading data for last ${days} days...`);
  
  // In production, this would fetch new data from the API
  // For now, we'll just reload with new mock data
  const newData = generateMockData(days);
  
  // Clear and repopulate
  populateMetrics(newData);
  
  // You would need to destroy and recreate charts here
  console.log('Charts would be updated with new data');
});

// ============================================
// INITIALIZE DASHBOARD
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Dashboard initializing...');
  
  // Generate mock data
  const dashboardData = generateMockData(30);
  
  // Populate all sections
  populateMetrics(dashboardData);
  createMoodTrendChart(dashboardData);
  createActivityChart(dashboardData);
  createActivityHeatmap(dashboardData);
  populateRecentActivity(dashboardData);
  
  console.log('✅ Dashboard loaded successfully');
});

// ============================================
// API INTEGRATION (TODO)
// ============================================

/*
// Real API calls would look like this:

async function fetchDashboardData(days = 30) {
  try {
    const response = await fetch(`/api/dashboard/metrics?days=${days}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch dashboard data');
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    // Fall back to mock data
    return generateMockData(days);
  }
}
*/