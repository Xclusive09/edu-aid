/**
 * EDU_AID Authentication Module
 * Handles login, signup, session management, and logout.
 * Uses mock data for development. Replace with real API later.
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
  },
  'student@edu-aid.com': {
    id: 'student_001',
    email: 'student@edu-aid.com',
    password: 'student123',
    name: 'Student Demo',
    role: 'student',
    avatar: 'S'
  }
};

/**
 * Login user with email/password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, user: object, token: string}>}
 */
async function loginUser(email, password) {
  try {
    console.log('[Auth] Login attempt:', email);

    // Simulate network delay
    await new Promise(r => setTimeout(r, 800));

    const user = MOCK_USERS[email];
    if (!user || user.password !== password) {
      throw new Error('Invalid email or password.');
    }

    // Generate JWT-style token (base64)
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: Date.now(),
      exp: Date.now() + 24 * 60 * 60 * 1000 // 24h
    };
    const token = btoa(JSON.stringify(payload));

    // Store session
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar
    }));

    console.log('[Auth] Login successful:', user.role);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    };

  } catch (error) {
    console.error('[Auth] Login failed:', error.message);
    throw error;
  }
}

/**
 * Mock signup (development only)
 */
async function signupUser(email, password, name) {
  await new Promise(r => setTimeout(r, 800));

  if (MOCK_USERS[email]) {
    throw new Error('User already exists.');
  }

  return {
    success: true,
    message: 'Account created! Please sign in.'
  };
}

/**
 * Check if user is authenticated and token is valid
 */
function isAuthenticated() {
  const token = localStorage.getItem('token');
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) {
      console.log('[Auth] Token expired');
      logoutUser();
      return false;
    }
    return true;
  } catch (e) {
    console.log('[Auth] Invalid token');
    logoutUser();
    return false;
  }
}

/**
 * Get current logged-in user
 */
function getCurrentUser() {
  if (!isAuthenticated()) return null;
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch (e) {
    console.error('[Auth] Failed to parse user data');
    return null;
  }
}

/**
 * Logout and clear session
 */
function logoutUser() {
  console.log('[Auth] Logging out...');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('rememberMe');
  window.location.href = 'login.html';
}

/**
 * Export for use in api.js
 */
window.auth = {
  loginUser,
  signupUser,
  isAuthenticated,
  getCurrentUser,
  logoutUser
};