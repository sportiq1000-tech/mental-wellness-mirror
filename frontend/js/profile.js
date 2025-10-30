/**
 * Profile Page Logic
 * Mental Wellness Mirror
 */

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
// TAB SWITCHING
// ============================================

const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    
    // Remove active class from all tabs and panels
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));
    
    // Add active class to clicked tab and corresponding panel
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
    
    const formData = {
      firstName: document.getElementById('firstName').value,
      lastName: document.getElementById('lastName').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      timezone: document.getElementById('timezone').value
    };
    
    console.log('Updating account:', formData);
    
    // Mock API call
    await mockAPICall('/api/user/update', formData);
    
    showNotification('Account updated successfully!', 'success');
  });
}

// ============================================
// PASSWORD FORM SUBMISSION
// ============================================

const passwordForm = document.getElementById('passwordForm');
const newPasswordInput = document.getElementById('newPassword');
const passwordStrengthBar = document.querySelector('.strength-bar');

// Password strength checker
if (newPasswordInput) {
  newPasswordInput.addEventListener('input', (e) => {
    const password = e.target.value;
    const strength = calculatePasswordStrength(password);
    
    passwordStrengthBar.style.width = `${strength.percentage}%`;
    passwordStrengthBar.dataset.strength = strength.level;
  });
}

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
    
    console.log('Updating password...');
    
    // Mock API call
    await mockAPICall('/api/user/change-password', {
      currentPassword,
      newPassword
    });
    
    showNotification('Password updated successfully!', 'success');
    passwordForm.reset();
    passwordStrengthBar.style.width = '0%';
  });
}

// ============================================
// THEME CHANGE
// ============================================

const themeSelect = document.getElementById('themeSelect');

if (themeSelect) {
  themeSelect.addEventListener('change', (e) => {
    const theme = e.target.value;
    console.log('Changing theme to:', theme);
    
    // In production, this would apply the actual theme
    localStorage.setItem('theme', theme);
    showNotification(`Theme changed to ${theme}`, 'success');
  });
  
  // Load saved theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  themeSelect.value = savedTheme;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showNotification(message, type = 'success') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // Add styles
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
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

async function mockAPICall(endpoint, data) {
  // Simulate API delay
  return new Promise(resolve => {
    setTimeout(() => {
      console.log(`API Call to ${endpoint}:`, data);
      resolve({ success: true });
    }, 500);
  });
}

function confirmDeleteAccount() {
  const confirmed = confirm(
    '⚠️ WARNING: This will permanently delete your account and all data.\n\n' +
    'This action cannot be undone.\n\n' +
    'Type "DELETE" to confirm.'
  );
  
  if (confirmed) {
    const verification = prompt('Type DELETE to confirm:');
    if (verification === 'DELETE') {
      console.log('Deleting account...');
      showNotification('Account deletion initiated. You will receive a confirmation email.', 'error');
      
      // In production:
      // await fetch('/api/user/delete', { method: 'DELETE' });
      // Redirect to goodbye page
    }
  }
}

function confirmClearHistory() {
  const confirmed = confirm(
    'Are you sure you want to clear all chat history?\n\n' +
    'This action cannot be undone.'
  );
  
  if (confirmed) {
    console.log('Clearing chat history...');
    showNotification('Chat history cleared successfully!', 'success');
    
    // In production:
    // await fetch('/api/user/clear-history', { method: 'POST' });
  }
}

// ============================================
// ANIMATIONS (CSS in JS for notification)
// ============================================

const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// ============================================
// INITIALIZE
// ============================================

console.log('✅ Profile page loaded');