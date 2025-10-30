/**
 * Profile Page Logic
 * UPDATED: Real user data with authentication
 */

// ============================================
// AUTHENTICATION CHECK (ADD AT TOP)
// ============================================
if (!window.authManager || !window.authManager.requireAuth()) {
  throw new Error('Authentication required');
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('✅ Profile page loaded');
  
  // ============================================
  // SIDEBAR TOGGLE
  // ============================================
  const toggleSidebarBtn = document.getElementById('toggleSidebar');
  const sidebar = document.getElementById('sidebar');

  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !toggleSidebarBtn.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      }
    });
  }

  // ============================================
  // LOAD USER PROFILE
  // ============================================
  
  try {
    const profileResponse = await window.api.getProfile();
    const profile = profileResponse.data.user;
    
    // Update profile display
    document.getElementById('firstName').value = profile.fullName?.split(' ')[0] || '';
    document.getElementById('lastName').value = profile.fullName?.split(' ').slice(1).join(' ') || '';
    document.getElementById('email').value = profile.email || '';
    document.querySelector('.profile-name').textContent = profile.fullName || 'User';
    document.querySelector('.profile-email').textContent = profile.email || '';
    
    // Update sidebar
    const userName = document.querySelector('.user-name');
    const userEmail = document.querySelector('.user-email');
    if (userName) userName.textContent = profile.fullName || profile.username || 'User';
    if (userEmail) userEmail.textContent = profile.email;
    
    console.log('✅ Profile loaded:', profile.email);
    
  } catch (error) {
    console.error('Error loading profile:', error);
    showNotification('Failed to load profile', 'error');
  }

  // ============================================
  // TAB SWITCHING
  // ============================================
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      document.querySelector(`[data-panel="${tabName}"]`).classList.add('active');
    });
  });

  // ============================================
  // ACCOUNT FORM SUBMISSION
  // ============================================
  const accountForm = document.getElementById('accountForm');

  if (accountForm) {
    accountForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const firstName = document.getElementById('firstName').value.trim();
      const lastName = document.getElementById('lastName').value.trim();
      const email = document.getElementById('email').value.trim();
      
      try {
        const updates = {
          fullName: `${firstName} ${lastName}`.trim(),
          email: email
        };
        
        const response = await window.api.updateProfile(updates);
        
        if (response.success) {
          // Update local user data
          const user = window.authManager.getCurrentUser();
          user.fullName = updates.fullName;
          user.email = updates.email;
          window.authManager.user = user;
          window.authManager.saveToStorage();
          
          showNotification('Profile updated successfully!', 'success');
        }
        
      } catch (error) {
        console.error('Error updating profile:', error);
        showNotification(error.message || 'Failed to update profile', 'error');
      }
    });
  }

  // ============================================
  // PASSWORD FORM SUBMISSION
  // ============================================
  const passwordForm = document.getElementById('passwordForm');
  const newPasswordInput = document.getElementById('newPassword');
  const passwordStrengthBar = document.querySelector('.strength-bar');

  // Password strength checker
  if (newPasswordInput && passwordStrengthBar) {
    newPasswordInput.addEventListener('input', (e) => {
      const password = e.target.value;
      const strength = calculatePasswordStrength(password);
      
      passwordStrengthBar.style.width = `${strength.percentage}%`;
      passwordStrengthBar.dataset.strength = strength.level;
    });
  }

  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      // Validation
      if (newPassword !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
      }
      
      if (newPassword.length < 8) {
        showNotification('Password must be at least 8 characters!', 'error');
        return;
      }
      
      try {
        await window.api.changePassword(currentPassword, newPassword);
        
        showNotification('Password updated successfully!', 'success');
        passwordForm.reset();
        if (passwordStrengthBar) passwordStrengthBar.style.width = '0%';
        
      } catch (error) {
        console.error('Error changing password:', error);
        showNotification(error.message || 'Failed to update password', 'error');
      }
    });
  }

  // ============================================
  // THEME CHANGE
  // ============================================
  const themeSelect = document.getElementById('themeSelect');

  if (themeSelect) {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    themeSelect.value = savedTheme;
    
    themeSelect.addEventListener('change', (e) => {
      const theme = e.target.value;
      localStorage.setItem('theme', theme);
      showNotification(`Theme changed to ${theme}`, 'success');
      
      // Apply theme (if you have dark mode CSS)
      if (theme === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    });
  }

  // ============================================
  // LOAD SESSIONS
  // ============================================
  try {
    const sessionsResponse = await window.api.getSessions();
    displaySessions(sessionsResponse.data.sessions);
  } catch (error) {
    console.error('Error loading sessions:', error);
  }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

function calculatePasswordStrength(password) {
  let score = 0;
  
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 25;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 25;
  if (/\d/.test(password)) score += 15;
  if (/[^a-zA-Z\d]/.test(password)) score += 10;
  
  let level = 'weak';
  if (score >= 75) level = 'strong';
  else if (score >= 50) level = 'medium';
  
  return { percentage: Math.min(score, 100), level };
}

function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  Object.assign(notification.style, {
    position: 'fixed',
    top: '2rem',
    right: '2rem',
    padding: '1rem 1.5rem',
    background: type === 'success' ? '#4caf50' : '#f44336',
    color: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: '10000',
    animation: 'slideIn 0.3s ease'
  });
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function displaySessions(sessions) {
  // TODO: Display active sessions in the UI
  console.log('Active sessions:', sessions);
}

function confirmDeleteAccount() {
  const confirmed = confirm(
    '⚠️ WARNING: This will permanently delete your account and all data.\n\n' +
    'This action cannot be undone.\n\n' +
    'Are you sure?'
  );
  
  if (confirmed) {
    const password = prompt('Enter your password to confirm deletion:');
    if (password) {
      deleteAccount(password);
    }
  }
}

async function deleteAccount(password) {
  try {
    await window.api.deleteAccount(password);
    showNotification('Account deleted successfully. Redirecting...', 'success');
    
    setTimeout(() => {
      window.authManager.clearAuth();
      window.location.href = '/';
    }, 2000);
    
  } catch (error) {
    console.error('Error deleting account:', error);
    showNotification(error.message || 'Failed to delete account', 'error');
  }
}

function confirmClearHistory() {
  const confirmed = confirm(
    'Are you sure you want to clear all chat history?\n\n' +
    'This action cannot be undone.'
  );
  
  if (confirmed) {
    // TODO: Implement clear history API call
    showNotification('Chat history cleared successfully!', 'success');
  }
}

// Make functions global for onclick handlers
window.confirmDeleteAccount = confirmDeleteAccount;
window.confirmClearHistory = confirmClearHistory;