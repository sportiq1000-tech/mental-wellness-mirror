/**
 * Shared Sidebar Logic
 * Populates user info and recent chats
 */

async function initializeSidebar() {
  console.log('Initializing sidebar...');

  // 1. Get DOM Elements
  const userNameEl = document.querySelector('.sidebar .user-name');
  const userEmailEl = document.querySelector('.sidebar .user-email');
  const recentChatsEl = document.getElementById('recentChatsSidebar');



  // 3. Load and Display Recent Chats
  if (recentChatsEl && window.api) {
    try {
      const response = await window.api.getChatHistory(3, 0); // Fetch latest 3
      
      if (response.success && response.data.entries.length > 0) {
        recentChatsEl.innerHTML = ''; // Clear placeholder
        
        response.data.entries.forEach(entry => {
          const chatItem = createChatItemElement(entry);
          recentChatsEl.appendChild(chatItem);
        });

      } else {
        recentChatsEl.innerHTML = '<p class="no-recent-chats">No recent chats yet.</p>';
      }

    } catch (error) {
      console.error('Failed to load recent chats for sidebar:', error);
      recentChatsEl.innerHTML = '<p class="no-recent-chats">Could not load chats.</p>';
    }
  }
}

function createChatItemElement(entry) {
  const link = document.createElement('a');
  link.href = `chat.html?entry=${entry.id}`;
  link.className = 'chat-history-item';
  
  const title = entry.user_text.split(' ').slice(0, 5).join(' ') + '...';
  
  const now = new Date();
  const entryDate = new Date(entry.timestamp);
  const hoursAgo = Math.floor((now - entryDate) / 3600000);
  
  let timeText;
  if (hoursAgo < 1) {
    timeText = 'Just now';
  } else if (hoursAgo < 24) {
    timeText = `${hoursAgo}h ago`;
  } else {
    timeText = `${Math.floor(hoursAgo / 24)}d ago`;
  }

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