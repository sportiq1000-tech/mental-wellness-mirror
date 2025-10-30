/**
 * Authentication Page Logic
 * Wired up to real backend API
 */

document.addEventListener('DOMContentLoaded', () => {
  
  // Check if already logged in
  if (window.authManager && window.authManager.isAuthenticated()) {
    console.log('User already authenticated, redirecting...');
    window.location.href = '/pages/chat.html';
    return;
  }

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
// DEBUG: Check if dependencies loaded
console.log('🔍 Auth.js loaded');
console.log('🔍 authManager available?', typeof window.authManager);
console.log('🔍 api available?', typeof window.api);

if (!window.authManager) {
  console.error('❌ auth-manager.js not loaded!');
}
if (!window.api) {
  console.error('❌ api-client.js not loaded!');
}

// ... rest of your auth.js code
  // ============================================
  // LOGIN FORM
  // ============================================
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      
      try {
        // Disable form
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
        
        // Get form data
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        // Clear previous errors
        clearErrors(loginForm);
        
        // Call API
        const response = await window.api.login(email, password);
        
        if (response.success) {
          // Set authentication
          window.authManager.setAuth(response.data.tokens, response.data.user);
          
          // Show success message
          showSuccess(loginForm, 'Login successful! Redirecting...');
          
          // Redirect to chat
          setTimeout(() => {
            window.location.href = '/pages/chat.html';
          }, 500);
        }
        
      } catch (error) {
        console.error('Login error:', error);
        showError(loginForm, error.message || 'Login failed. Please try again.');
        
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  // ============================================
  // REGISTER FORM
  // ============================================
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      
      try {
        // Disable form
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';
        
        // Get form data
        const fullName = document.getElementById('fullName')?.value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        
        // Clear previous errors
        clearErrors(registerForm);
        
        // Client-side validation
        if (confirmPassword && password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        
        // Call API
        const response = await window.api.register(email, password, fullName);
        
        if (response.success) {
          // Set authentication
          window.authManager.setAuth(response.data.tokens, response.data.user);
          
          // Show success message
          showSuccess(registerForm, 'Account created successfully! Redirecting...');
          
          // Redirect to chat
          setTimeout(() => {
            window.location.href = '/pages/chat.html';
          }, 500);
        }
        
      } catch (error) {
        console.error('Registration error:', error);
        
        // Show error details if available
        let errorMessage = error.message || 'Registration failed. Please try again.';
        
        if (error.details && Array.isArray(error.details)) {
          errorMessage = error.details.join(', ');
        }
        
        showError(registerForm, errorMessage);
        
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });

    // Password strength indicator
    const passwordInput = document.getElementById('password');
    const strengthBar = document.querySelector('.password-strength-bar');

    if (passwordInput && strengthBar) {
      passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        const strength = calculatePasswordStrength(password);
        
        strengthBar.className = 'password-strength-bar';
        if (strength <= 2) {
          strengthBar.classList.add('strength-weak');
        } else if (strength <= 4) {
          strengthBar.classList.add('strength-medium');
        } else {
          strengthBar.classList.add('strength-strong');
        }
      });
    }
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculatePasswordStrength(password) {
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (password.match(/[A-Z]/)) strength++;
  if (password.match(/[a-z]/)) strength++;
  if (password.match(/[0-9]/)) strength++;
  if (password.match(/[^A-Za-z0-9]/)) strength++;
  
  return strength;
}

function showError(form, message) {
  clearErrors(form);
  
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.style.cssText = `
    background: #fee;
    border: 1px solid #fcc;
    color: #c33;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  `;
  errorDiv.textContent = message;
  
  form.insertBefore(errorDiv, form.firstChild);
}

function showSuccess(form, message) {
  clearErrors(form);
  
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.style.cssText = `
    background: #efe;
    border: 1px solid #cfc;
    color: #3c3;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  `;
  successDiv.textContent = message;
  
  form.insertBefore(successDiv, form.firstChild);
}

function clearErrors(form) {
  const existing = form.querySelectorAll('.error-message, .success-message');
  existing.forEach(el => el.remove());
}