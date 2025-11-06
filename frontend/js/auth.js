/**
 * Authentication logic for EDU_AID.
 * Handles login, signup, and logout with mock authentication for development.
 * Stores JWT in localStorage for session management.
 */

/**
 * Mock user database for development/testing
 */
const MOCK_USERS = {
    'admin@edu-aid.com': {
        id: 'admin_001',
        email: 'admin@edu-aid.com',
        password: 'admin123',
        name: 'Administrator',
        role: 'admin',
        avatar: 'A'
    },
    'teacher@edu-aid.com': {
        id: 'teacher_001',
        email: 'teacher@edu-aid.com',
        password: 'teacher123',
        name: 'Teacher Demo',
        role: 'teacher',
        avatar: 'T'
    }
};

/**
 * Validates login credentials against mock database
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise} Authentication response
 */
async function loginUser(email, password) {
    try {
        console.log('Attempting login for:', email);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Validate credentials
        const user = MOCK_USERS[email];
        if (!user || user.password !== password) {
            console.log('Invalid credentials for:', email);
            throw new Error('Invalid email or password. Please check your credentials.');
        }

        console.log('Login successful for:', email);

        // Generate mock JWT token
        const token = btoa(JSON.stringify({
            userId: user.id,
            email: user.email,
            role: user.role,
            exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        }));

        // Store authentication data
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatar: user.avatar
        }));

        console.log('User data stored:', user);

        // Return success response
        return {
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            token: token
        };

    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

/**
 * Mock signup function for development
 */
async function signupUser(email, password, name) {
    try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if user already exists
        if (MOCK_USERS[email]) {
            throw new Error('User already exists with this email address.');
        }

        // In a real implementation, you would save to database
        // For now, just return success
        return {
            success: true,
            message: 'Account created successfully! Please sign in.'
        };

    } catch (error) {
        throw error;
    }
}

/**
 * Checks if user is authenticated
 */
function isAuthenticated() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    console.log('Checking authentication - token:', !!token, 'user:', !!user);
    
    if (!token || !user) {
        return false;
    }

    try {
        // Validate token expiry
        const tokenData = JSON.parse(atob(token));
        if (tokenData.exp < Date.now()) {
            console.log('Token expired');
            // Token expired
            logoutUser();
            return false;
        }
        console.log('User is authenticated');
        return true;
    } catch (error) {
        console.log('Invalid token:', error);
        // Invalid token
        logoutUser();
        return false;
    }
}

/**
 * Gets current user data
 */
function getCurrentUser() {
    if (!isAuthenticated()) {
        return null;
    }
    
    try {
        const userData = JSON.parse(localStorage.getItem('user'));
        console.log('Current user:', userData);
        return userData;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

/**
 * Logs out the user by clearing localStorage and redirecting to index.html.
 */
function logoutUser() {
    console.log('Logging out user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('mockAuthToken');
    localStorage.removeItem('userSession');
    window.location.href = 'index.html';
}

/**
 * Submits login form data to /login endpoint.
 * Stores JWT in localStorage and redirects to dashboard.html on success.
 */
async function login() {
    const form = document.getElementById('login-form');
    const formMessages = document.getElementById('form-messages');
    if (!form || !formMessages) return;

    try {
        // Clear any previous messages
        formMessages.innerHTML = '';

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Signing in...';
        submitBtn.disabled = true;

        // Get form data
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Validate email format
        if (!validateEmail(email)) {
            throw new Error('Invalid email format. Please enter a valid email address.');
        }

        // For development: bypass authentication and set mock data
        localStorage.setItem('mockAuthToken', 'mock-token-123');
        localStorage.setItem('userSession', JSON.stringify({
            email: email,
            id: 'mock-user-123'
        }));

        // Authenticate user (replace with real API call in production)
        const response = await loginUser(email, password);
        if (!response.success) {
            throw new Error('Login failed. Please check your credentials and try again.');
        }

        // Redirect to dashboard
        console.log('Redirecting to dashboard...');
        window.location.href = 'dashboard.html'; // Changed from replace to href

    } catch (error) {
        console.error('Login error:', error);

        // Show error message
        formMessages.innerHTML = `
            <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <p class="font-medium">Login failed</p>
                <p class="text-sm">${error.message}</p>
            </div>
        `;

        // Reset button
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Prevent form from submitting normally
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            login();
        });
    }
});

/**
 * Validates email format using a regular expression.
 * @param {string} email - Email address to validate.
 * @returns {boolean} True if the email format is valid, false otherwise.
 */
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}