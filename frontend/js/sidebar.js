/**
 * Shared Sidebar Logic
 * Populates user info and recent chats
 */

async function initializeSidebar() {
  console.log('Initializing sidebar...');

  // 1. Get DOM Elements
  const userNameEl = document.querySelector('.sidebar .user-name');
  const userEmailEl = document.querySelector('.sidebar .user-email');
  const recentChatsStandard = document.getElementById('recentChatsSidebar');
  const recentChatsNavSection = document.getElementById('recentChatsNavSection');

  // 2. Load and Display User Info
  if (window.authManager && window.authManager.isAuthenticated()) {
    const currentUser = window.authManager.getCurrentUser();
    if (currentUser) {
      if (userNameEl) userNameEl.textContent = currentUser.fullName || currentUser.username || 'User';
      if (userEmailEl) userEmailEl.textContent = currentUser.email;
    }
  }

  // 3. Load and Display Recent Chats
  if (window.api && (recentChatsStandard || recentChatsNavSection)) {
    try {
      const response = await window.api.getChatHistory(3, 0); // Fetch latest 3
      
      if (response.success && response.data.entries.length > 0) {
        // If it's the chat.html structure
        if (recentChatsNavSection) {
          // Remove existing placeholder links
          recentChatsNavSection.querySelectorAll('.nav-item').forEach(item => item.remove());
          
          response.data.entries.forEach(entry => {
            const chatItem = createNavItemElement(entry);
            recentChatsNavSection.appendChild(chatItem);
          });
        }
        
        // If it's the standard structure (dashboard, profile, etc.)
        if (recentChatsStandard) {
          recentChatsStandard.innerHTML = '';
          response.data.entries.forEach(entry => {
            const chatItem = createHistoryItemElement(entry);
            recentChatsStandard.appendChild(chatItem);
          });
        }
      } else {
        const noChatsMessage = '<p class="no-recent-chats">No recent chats yet.</p>';
        if (recentChatsStandard) recentChatsStandard.innerHTML = noChatsMessage;
        if (recentChatsNavSection) {
          recentChatsNavSection.querySelectorAll('.nav-item').forEach(item => item.remove());
          recentChatsNavSection.insertAdjacentHTML('beforeend', noChatsMessage);
        }
      }

    } catch (error) {
      console.error('Failed to load recent chats for sidebar:', error);
      const errorMessage = '<p class="no-recent-chats">Could not load chats.</p>';
      if (recentChatsStandard) recentChatsStandard.innerHTML = errorMessage;
      if (recentChatsNavSection) {
        recentChatsNavSection.querySelectorAll('.nav-item').forEach(item => item.remove());
        recentChatsNavSection.insertAdjacentHTML('beforeend', errorMessage);
      }
    }
  }
}

// Function to create item for chat.html's nav-section
function createNavItemElement(entry) {
  const link = document.createElement('a');
  link.href = `chat.html?entry=${entry.id}`;
  link.className = 'nav-item';
  
  const title = entry.user_text.split(' ').slice(0, 3).join(' ') + '...';

  link.innerHTML = `
    <i class="far fa-comment"></i>
    <span>${escapeHtml(title)}</span>
  `;
  
  return link;
}

// Function to create item for the standard history list
function createHistoryItemElement(entry) {
  const link = document.createElement('a');
  link.href = `chat.html?entry=${entry.id}`;
  link.className = 'chat-history-item';
  
  const title = entry.user_text.split(' ').slice(0, 5).join(' ') + '...';
  
  const now = new Date();
  const entryDate = new Date(entry.timestamp);
  const hoursAgo = Math.floor((now - entryDate) / 3600000);
  
  let timeText;
  if (hoursAgo < 1) timeText = 'Just now';
  else if (hoursAgo < 24) timeText = `${hoursAgo}h ago`;
  else timeText = `${Math.floor(hoursAgo / 24)}d ago`;

  link.innerHTML = `
    <span class="chat-title">${escapeHtml(title)}</span>
    <span class="chat-date">${timeText}</span>
  `;
  
  return link;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Run initialization on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSidebar);
} else {
  initializeSidebar();
}