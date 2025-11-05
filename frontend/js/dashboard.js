// Dashboard initialization
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Dashboard DOM loaded');

    try {
        // Check authentication
        const token = localStorage.getItem('mockAuthToken');
        const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');

        console.log('Token:', token);
        console.log('User session:', userSession);

        if (!token) {
            console.log('No token found, redirecting to login');
            window.location.href = 'login.html';
            return;
        }

        // Initialize dashboard
        initializeDashboard();

    } catch (error) {
        console.error('Dashboard initialization error:', error);
        // Don't redirect, just show error
        showError('Failed to initialize dashboard: ' + error.message);
    }
});

function initializeDashboard() {
    console.log('Initializing dashboard...');

    try {
        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
            console.log('Lucide icons initialized');
        }

        // Set current date
        const dateElement = document.getElementById('currentDate');
        if (dateElement) {
            dateElement.textContent = new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        // Set user info
        const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');

        if (userName && userSession.email) {
            userName.textContent = userSession.email.split('@')[0];
        }

        if (userAvatar && userSession.email) {
            userAvatar.textContent = userSession.email.charAt(0).toUpperCase();
        }

        // Initialize stats with default values
        updateStats({
            totalAnalyses: 0,
            studentsAnalyzed: 0,
            aiInsights: 0,
            averageScore: '--'
        });

        // Setup event listeners
        setupEventListeners();

        console.log('Dashboard initialized successfully');

    } catch (error) {
        console.error('Error in initializeDashboard:', error);
        showError('Dashboard initialization failed: ' + error.message);
    }
}

function updateStats(stats) {
    const elements = {
        totalAnalyses: document.getElementById('totalAnalyses'),
        studentsAnalyzed: document.getElementById('studentsAnalyzed'),
        aiInsights: document.getElementById('aiInsights'),
        averageScore: document.getElementById('averageScore')
    };

    Object.keys(stats).forEach(key => {
        if (elements[key]) {
            elements[key].textContent = stats[key];
        }
    });
}

function setupEventListeners() {
    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }

    // User dropdown toggle
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');

    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            userDropdown.classList.add('hidden');
        });
    }

    console.log('Event listeners setup complete');
}

function logout() {
    console.log('Logging out...');
    localStorage.removeItem('mockAuthToken');
    localStorage.removeItem('userSession');
    window.location.href = 'login.html';
}

function showError(message) {
    console.error('Dashboard Error:', message);

    // Create error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg z-50';
    errorDiv.innerHTML = `
        <div class="flex items-center">
            <i data-lucide="alert-circle" class="w-5 h-5 mr-2"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </div>
    `;

    document.body.appendChild(errorDiv);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);

    // Reinitialize icons after adding new elements
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

console.log('Dashboard script loaded');