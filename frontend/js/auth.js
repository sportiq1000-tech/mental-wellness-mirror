document.addEventListener('DOMContentLoaded', () => {
    
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Mock Login
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Redirect to chat page on successful login
            window.location.href = 'chat.html';
        });
    }

    // Mock Register
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Redirect to chat page on successful registration
            window.location.href = 'chat.html';
        });

        // Password strength checker (visual only)
        const passwordInput = document.getElementById('password');
        const strengthBar = document.querySelector('.password-strength-bar');

        if (passwordInput && strengthBar) {
            passwordInput.addEventListener('input', () => {
                const password = passwordInput.value;
                let strength = 0;
                
                if (password.length >= 8) strength++;
                if (password.match(/[A-Z]/)) strength++;
                if (password.match(/[a-z]/)) strength++;
                if (password.match(/[0-9]/)) strength++;
                if (password.match(/[^A-Za-z0-9]/)) strength++;

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