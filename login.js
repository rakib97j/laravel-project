class LoginApp {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingSession();
    }

    setupEventListeners() {
        // Login form submission
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Password visibility toggle
        document.getElementById('togglePassword').addEventListener('click', () => {
            this.togglePasswordVisibility();
        });

        // Phone number formatting
        document.getElementById('phoneNumber').addEventListener('input', (e) => {
            this.formatPhoneNumber(e.target);
        });

        // Signup link
        document.getElementById('signupLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showNotification('📝 রেজিস্ট্রেশন শীঘ্রই আসছে!', 'info');
        });

        // Forgot password link
        document.querySelector('.forgot-password').addEventListener('click', (e) => {
            e.preventDefault();
            this.showNotification('🔒 পাসওয়ার্ড রিসেট শীঘ্রই আসছে!', 'info');
        });
    }

    formatPhoneNumber(input) {
        // Remove all non-digit characters
        let value = input.value.replace(/\D/g, '');
        
        // Ensure it starts with 01
        if (value.length > 0 && !value.startsWith('01')) {
            value = '01' + value.substring(2);
        }
        
        // Limit to 11 digits
        if (value.length > 11) {
            value = value.substring(0, 11);
        }
        
        input.value = value;
    }

    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const toggleBtn = document.getElementById('togglePassword');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleBtn.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            toggleBtn.textContent = '👁️';
        }
    }

    async handleLogin() {
        const phoneNumber = document.getElementById('phoneNumber').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        // Validation
        if (!this.validatePhoneNumber(phoneNumber)) {
            this.showNotification('📱 সঠিক মোবাইল নম্বর দিন', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification('🔒 পাসওয়ার্ড কমপক্ষে 6 ডিজিটের হতে হবে', 'error');
            return;
        }

        // Show loading state
        this.setLoadingState(true);

        try {
            // Simulate API call
            await this.simulateLoginAPI(phoneNumber, password);
            
            // Generate unique user ID
            const userId = this.generateUserId(phoneNumber);
            
            // Create user session
            const userData = {
                userId: userId,
                phoneNumber: phoneNumber,
                loginTime: new Date().toISOString(),
                rememberMe: rememberMe
            };

            // Store user data
            this.createUserSession(userData);
            
            // Show success message
            this.showNotification('✅ লগইন সফল! রিডাইরেক্ট হচ্ছে...', 'success');
            
            // Redirect to main app
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);

        } catch (error) {
            this.showNotification('❌ লগইন ব্যর্থ! ' + error.message, 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    validatePhoneNumber(phoneNumber) {
        const phoneRegex = /^01[3-9][0-9]{8}$/;
        return phoneRegex.test(phoneNumber);
    }

    generateUserId(phoneNumber) {
        // Generate unique ID based on phone number and timestamp
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const hash = this.simpleHash(phoneNumber + timestamp + random);
        return `USR${hash}`;
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
    }

    async simulateLoginAPI(phoneNumber, password) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Check if user exists in localStorage (simulating database)
        const users = this.getUsers();
        const user = users.find(u => u.phoneNumber === phoneNumber);
        
        if (!user) {
            throw new Error('ব্যবহারকারী পাওয়া যায়নি');
        }
        
        if (user.password !== this.hashPassword(password)) {
            throw new Error('ভুল পাসওয়ার্ড');
        }
        
        return user;
    }

    getUsers() {
        const stored = localStorage.getItem('users');
        return stored ? JSON.parse(stored) : this.createDefaultUsers();
    }

    createDefaultUsers() {
        // Create some default users for testing
        const defaultUsers = [
            {
                userId: 'USR12345678',
                phoneNumber: '01300000000',
                password: this.hashPassword('123456'),
                name: 'টেস্ট ইউজার',
                createdAt: new Date().toISOString()
            },
            {
                userId: 'USR87654321',
                phoneNumber: '01700000000',
                password: this.hashPassword('password'),
                name: 'ডেমো ইউজার',
                createdAt: new Date().toISOString()
            }
        ];
        
        localStorage.setItem('users', JSON.stringify(defaultUsers));
        return defaultUsers;
    }

    hashPassword(password) {
        // Simple hash for demonstration (in real app, use proper hashing)
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'HASH' + Math.abs(hash).toString(16);
    }

    createUserSession(userData) {
        if (userData.rememberMe) {
            localStorage.setItem('userSession', JSON.stringify(userData));
        } else {
            sessionStorage.setItem('userSession', JSON.stringify(userData));
        }
    }

    checkExistingSession() {
        const session = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
        if (session) {
            const userData = JSON.parse(session);
            // Redirect if session is valid and not too old (24 hours)
            const loginTime = new Date(userData.loginTime);
            const now = new Date();
            const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
            
            if (hoursDiff < 24) {
                this.showNotification('✅ পূর্ববর্তী সেশন পাওয়া গেছে', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } else {
                // Clear expired session
                localStorage.removeItem('userSession');
                sessionStorage.removeItem('userSession');
            }
        }
    }

    setLoadingState(loading) {
        const loginBtn = document.getElementById('loginBtn');
        const btnText = loginBtn.querySelector('.btn-text');
        const btnLoading = loginBtn.querySelector('.btn-loading');
        
        if (loading) {
            loginBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline';
        } else {
            loginBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// Initialize login app
const loginApp = new LoginApp();
