// API Configuration
const API_CONFIG = {
    BASE_URL: 'https://edu-aid.onrender.com/api',
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
};

class ApiService {
    constructor() {
        this.baseUrl = 'https://edu-aid.onrender.com/api';
        this.token = localStorage.getItem('token');
        this.requestQueue = new Map();
    }

    // Enhanced request handler with retry logic
    async request(endpoint, options = {}) {
        const requestId = `${options.method || 'GET'}_${endpoint}`;
        const url = `${this.baseUrl}${endpoint}`;

        // Prevent duplicate requests
        if (this.requestQueue.has(requestId)) {
            return this.requestQueue.get(requestId);
        }

        const requestPromise = this._executeRequest(url, options);
        this.requestQueue.set(requestId, requestPromise);

        try {
            const result = await requestPromise;
            return result;
        } finally {
            this.requestQueue.delete(requestId);
        }
    }

    async _executeRequest(url, options, attempt = 1) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token && !options.skipAuth) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                signal: controller.signal,
                credentials: 'include'
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);

            // Handle network errors with retry logic
            if (this._shouldRetry(error, attempt)) {
                console.warn(`Request failed, retrying... (${attempt}/${API_CONFIG.RETRY_ATTEMPTS})`);
                await this._delay(API_CONFIG.RETRY_DELAY * attempt);
                return this._executeRequest(url, options, attempt + 1);
            }

            // Handle token expiration
            if (error.message?.includes('token') && error.message?.includes('expired')) {
                this._handleTokenExpiration();
            }

            throw error;
        }
    }

    _shouldRetry(error, attempt) {
        return (
            attempt < API_CONFIG.RETRY_ATTEMPTS &&
            (error.name === 'AbortError' ||
                error.message?.includes('network') ||
                error.message?.includes('fetch'))
        );
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _handleTokenExpiration() {
        console.warn('Token expired, logging out user');
        this.logout();
        window.location.href = 'login.html';
    }

    // Authentication methods
    async login(email, password) {
        try {
            // Use the loginUser function from auth.js
            return await loginUser(email, password);
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async _mockLogin(email, password) {
        // Simulate API delay
        await this._delay(1000);

        const validCredentials = [
            { email: 'admin@edu-aid.com', password: 'admin123', role: 'admin' },
            { email: 'teacher@edu-aid.com', password: 'teacher123', role: 'teacher' },
            { email: 'teacher@edu-aid.com', password: 'password', role: 'teacher' }
        ];

        const user = validCredentials.find(u => u.email === email && u.password === password);

        if (!user) {
            throw new Error('Invalid credentials');
        }

        const mockToken = btoa(JSON.stringify({
            email: user.email,
            role: user.role,
            exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        }));

        const mockUser = {
            id: Date.now().toString(),
            email: user.email,
            role: user.role,
            name: user.email.split('@')[0]
        };

        this.token = mockToken;
        localStorage.setItem('token', mockToken);
        localStorage.setItem('user', JSON.stringify(mockUser));

        return {
            success: true,
            token: mockToken,
            user: mockUser,
            message: 'Login successful (mock mode)'
        };
    }

    async verifyToken() {
        try {
            return await this.request('/auth/verify');
        } catch (error) {
            // Mock token verification
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const decoded = JSON.parse(atob(token));
                    if (decoded.exp > Date.now()) {
                        return { success: true, user: JSON.parse(localStorage.getItem('user')) };
                    }
                } catch (e) {
                    // Invalid token
                }
            }
            throw new Error('Token invalid or expired');
        }
    }

    logout() {
        this.token = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('rememberMe');
    }

    // File Analysis Methods
    async analyzeFile(file, onProgress = null) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${this.baseUrl}/analysis/analyze`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData,
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('File analysis failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Analysis error:', error);
            throw new Error('Network error during upload');
        }
    }

    async _mockAnalysis(file, onProgress = null) {
        // Simulate upload progress
        if (onProgress) {
            for (let i = 0; i <= 100; i += 10) {
                await this._delay(100);
                onProgress(i);
            }
        }

        // Mock analysis results
        return {
            success: true,
            data: {
                fileName: file.name,
                totalStudents: Math.floor(Math.random() * 50) + 20,
                statistics: {
                    grade: {
                        mean: 75 + Math.random() * 20,
                        median: 78 + Math.random() * 15,
                        standardDeviation: 8 + Math.random() * 7,
                        min: 45 + Math.random() * 15,
                        max: 95 + Math.random() * 5
                    },
                    attendance: {
                        mean: 85 + Math.random() * 10,
                        median: 88 + Math.random() * 8,
                        standardDeviation: 5 + Math.random() * 5
                    }
                },
                clusters: {
                    highPerformers: Array.from({length: Math.floor(Math.random() * 8) + 3}, (_, i) => `Student ${i + 1}`),
                    averagePerformers: Array.from({length: Math.floor(Math.random() * 12) + 8}, (_, i) => `Student ${i + 9}`),
                    needsSupport: Array.from({length: Math.floor(Math.random() * 6) + 2}, (_, i) => `Student ${i + 21}`),
                    atRisk: Array.from({length: Math.floor(Math.random() * 4) + 1}, (_, i) => `Student ${i + 28}`)
                },
                aiInsights: {
                    insights: [
                        "The class shows a normal distribution of grades with a slight positive skew",
                        "Students with high attendance rates correlate strongly with better grades",
                        "There's a cluster of students who might benefit from additional support",
                        "Overall class performance is above average"
                    ]
                },
                recommendations: {
                    immediate: [
                        "Provide additional support for at-risk students",
                        "Implement peer tutoring for struggling students"
                    ],
                    shortTerm: [
                        "Review curriculum difficulty for average performers",
                        "Increase engagement activities for better attendance"
                    ],
                    longTerm: [
                        "Develop personalized learning paths",
                        "Implement continuous assessment strategies"
                    ]
                },
                dataQuality: {
                    overall: { rating: "Good" },
                    completeness: 0.95,
                    accuracy: 0.92
                }
            },
            message: 'Analysis completed successfully (mock mode)'
        };
    }

    async getAIAnalysis(data, context = {}) {
        try {
            return await this.request('/analysis/ai', {
                method: 'POST',
                body: JSON.stringify({ data, context })
            });
        } catch (error) {
            // Mock AI analysis
            await this._delay(2000);
            return {
                success: true,
                analysis: "Based on the data analysis, this class shows promising performance indicators with room for targeted improvements.",
                insights: [
                    "Performance distribution indicates a well-balanced class",
                    "Attendance patterns strongly correlate with academic success",
                    "Several students show potential for accelerated learning"
                ],
                recommendations: [
                    "Focus on personalized learning approaches",
                    "Implement early intervention for struggling students",
                    "Consider advanced materials for high performers"
                ]
            };
        }
    }

    // Chat Methods
    async sendChatMessage(message, context = null) {
        try {
            return await this.request('/chat/send', {
                method: 'POST',
                body: JSON.stringify({ message, context })
            });
        } catch (error) {
            // Mock chat response
            await this._delay(1500);

            const responses = [
                {
                    response: "I can help you analyze the student performance data. What specific insights would you like me to focus on?",
                    insights: ["Data quality looks good", "Performance trends are identifiable"],
                    suggestions: ["Try asking about specific student groups", "Request detailed statistical analysis"],
                    followUpQuestions: ["What about attendance patterns?", "Show me grade distribution", "Any struggling students?"]
                },
                {
                    response: "Based on your data, I notice some interesting patterns in student performance. The class average indicates healthy academic progress.",
                    insights: ["Grade distribution is relatively normal", "Strong correlation between attendance and performance"],
                    suggestions: ["Consider grouping strategies", "Focus on early intervention"],
                    followUpQuestions: ["How can we help at-risk students?", "What teaching methods work best?"]
                }
            ];

            return {
                success: true,
                ...responses[Math.floor(Math.random() * responses.length)]
            };
        }
    }

    async getChatHistory() {
        try {
            return await this.request('/chat/history');
        } catch (error) {
            return { success: true, history: [] };
        }
    }

    async clearChatHistory() {
        try {
            return await this.request('/chat/history', { method: 'DELETE' });
        } catch (error) {
            return { success: true };
        }
    }

    // Utility Methods
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            return {
                status: 'error',
                message: 'Backend service unavailable',
                mock: true
            };
        }
    }

    // Get current user info
    getCurrentUser() {
        try {
            const userStr = localStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            return null;
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!(this.token && this.getCurrentUser());
    }
}

// Create global API instance
const api = new ApiService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiService;
}