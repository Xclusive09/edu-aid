<!DOCTYPE html>
<html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - EDU_AID</title>
<link href="css/styles.css" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        </head>
        <body class="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen bg-pattern">
        <!-- Background Elements -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
            <div class="absolute -top-40 -right-32 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
            <div class="absolute -bottom-40 -left-32 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-pink-600/20 rounded-full blur-3xl"></div>
            <div class="absolute top-1/3 left-1/4 w-64 h-64 bg-gradient-to-br from-cyan-400/10 to-blue-600/10 rounded-full blur-2xl"></div>
        </div>

        <div class="flex min-h-screen">
            <!-- Left Side - Branding -->
            <div class="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700"></div>
                <div class="absolute inset-0 bg-black/20"></div>
                <div class="relative z-10 flex flex-col justify-center items-center p-12 text-white">
                    <div class="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-8 shadow-2xl">
                        <span class="text-4xl font-bold text-white">E</span>
                    </div>

                    <h1 class="text-5xl font-bold mb-4 text-center">EDU_AID</h1>
                    <p class="text-xl text-blue-100 text-center max-w-md mb-8">
                        Educational AI Assistant - Empowering teachers with intelligent student performance analysis
                    </p>

                    <div class="grid grid-cols-1 gap-4 max-w-sm w-full">
                        <div class="flex items-center space-x-3 text-blue-100">
                            <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                <i data-lucide="brain" class="w-4 h-4"></i>
                            </div>
                            <span>AI-Powered Insights</span>
                        </div>
                        <div class="flex items-center space-x-3 text-blue-100">
                            <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                <i data-lucide="bar-chart-3" class="w-4 h-4"></i>
                            </div>
                            <span>Advanced Analytics</span>
                        </div>
                        <div class="flex items-center space-x-3 text-blue-100">
                            <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                <i data-lucide="users" class="w-4 h-4"></i>
                            </div>
                            <span>Student Performance Tracking</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Side - Login Form -->
            <div class="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div class="w-full max-w-md">
                    <!-- Mobile Logo -->
                    <div class="lg:hidden text-center mb-12">
                        <div class="w-16 h-16 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                            <span class="text-2xl font-bold text-white">E</span>
                        </div>
                        <h1 class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">EDU_AID</h1>
                        <p class="text-gray-600">Educational AI Assistant</p>
                    </div>

                    <!-- Login Card -->
                    <div class="card">
                        <div class="text-center mb-8">
                            <h2 class="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
                            <p class="text-gray-600">Sign in to access your dashboard</p>
                        </div>

                        <!-- Messages Container -->
                        <div id="form-messages" class="mb-6"></div>

                        <!-- Login Form -->
                        <form id="login-form" class="space-y-6">
                            <div>
                                <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                                    Email Address
                                </label>
                                <div class="input-group">
                                    <i data-lucide="mail" class="input-icon"></i>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        required
                                        autocomplete="email"
                                        class="input-field input-field-with-icon"
                                        placeholder="Enter your email"
                                        value="admin@edu-aid.com"
                                    >
                                </div>
                            </div>

                            <div>
                                <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                                    Password
                                </label>
                                <div class="input-group">
                                    <i data-lucide="lock" class="input-icon"></i>
                                    <input
                                        type="password"
                                        id="password"
                                        name="password"
                                        required
                                        autocomplete="current-password"
                                        class="input-field input-field-with-icon"
                                        placeholder="Enter your password"
                                        value="admin123"
                                    >
                                        <button type="button" id="togglePassword" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none">
                                            <i data-lucide="eye" class="w-5 h-5"></i>
                                        </button>
                                </div>
                            </div>

                            <div class="flex items-center justify-between">
                                <div class="flex items-center">
                                    <input
                                        id="remember-me"
                                        name="remember-me"
                                        type="checkbox"
                                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    >
                                        <label for="remember-me" class="ml-2 block text-sm text-gray-700">
                                            Remember me
                                        </label>
                                </div>
                                <a href="#" class="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors">
                                    Forgot password?
                                </a>
                            </div>

                            <button
                                type="submit"
                                id="loginButton"
                                class="btn-primary w-full flex items-center justify-center"
                            >
                                <span id="loginButtonText">Sign In</span>
                                <div id="loginButtonSpinner" class="loading-spinner ml-2 hidden"></div>
                            </button>
                        </form>

                        <!-- Demo Credentials -->
                        <div class="mt-8 p-4 bg-blue-50/80 backdrop-blur-sm rounded-xl border border-blue-200">
                            <div class="flex items-center mb-2">
                                <i data-lucide="info" class="w-4 h-4 text-blue-600 mr-2"></i>
                                <span class="text-sm font-medium text-blue-800">Demo Credentials</span>
                            </div>
                            <div class="text-sm text-blue-700 space-y-1">
                                <p><strong>Email:</strong> admin@edu-aid.com</p>
                                <p><strong>Password:</strong> admin123</p>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div class="mt-8 text-center text-sm text-gray-500">
                            Don't have an account?
                            <a href="#" class="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                                Contact Administrator
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script>
            // Initialize Lucide icons
            lucide.createIcons();

            // Simple login handler
            document.addEventListener('DOMContentLoaded', function() {
            const loginForm = document.getElementById('login-form');
            const loginButton = document.getElementById('loginButton');
            const loginButtonText = document.getElementById('loginButtonText');
            const loginButtonSpinner = document.getElementById('loginButtonSpinner');
            const formMessages = document.getElementById('form-messages');
            const togglePassword = document.getElementById('togglePassword');
            const passwordInput = document.getElementById('password');

            // Password toggle
            if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            const icon = togglePassword.querySelector('i');
            if (type === 'password') {
            icon.setAttribute('data-lucide', 'eye');
        } else {
            icon.setAttribute('data-lucide', 'eye-off');
        }
            lucide.createIcons();
        });
        }

            // Form submission
            if (loginForm) {
            loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            try {
            // Clear previous messages
            formMessages.innerHTML = '';

            // Set loading state
            setLoadingState(true);

            // Get form data
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // For development: Mock authentication
            localStorage.setItem('mockAuthToken', 'mock-token-123');
            localStorage.setItem('userSession', JSON.stringify({
            email: email,
            id: 'mock-user-123'
        }));

            // Show success message
            showMessage('Login successful! Redirecting...', 'success');

            // Redirect after a short delay
            setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);

        } catch (error) {
            console.error('Login error:', error);
            setLoadingState(false);
            showMessage('Login failed: ' + error.message, 'error');
        }
        });
        }

            function setLoadingState(loading) {
            if (loginButton && loginButtonText && loginButtonSpinner) {
            if (loading) {
            loginButton.disabled = true;
            loginButtonText.textContent = 'Signing In...';
            loginButtonSpinner.classList.remove('hidden');
        } else {
            loginButton.disabled = false;
            loginButtonText.textContent = 'Sign In';
            loginButtonSpinner.classList.add('hidden');
        }
        }
        }

            function showMessage(message, type = 'info') {
            const bgColor = type === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
            type === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
            'bg-blue-50 border-blue-200 text-blue-700';

            const icon = type === 'error' ? 'alert-circle' :
            type === 'success' ? 'check-circle' : 'info';

            formMessages.innerHTML = `
                    <div class="${bgColor} border px-4 py-3 rounded-lg">
                        <div class="flex items-center">
                            <i data-lucide="${icon}" class="w-4 h-4 mr-2"></i>
                            <span>${message}</span>
                        </div>
                    </div>
                `;

            // Reinitialize icons
            lucide.createIcons();
        }
        });
        </script>
        </body>
    </html>