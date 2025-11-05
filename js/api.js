// js/api.js
window.api = {
  async login(email, password) {
    return await window.auth.loginUser(email, password);
  },

  async signup(email, password, name) {
    return await window.auth.signupUser(email, password, name);
  },

  isAuthenticated() {
    return window.auth.isAuthenticated();
  },

  getCurrentUser() {
    return window.auth.getCurrentUser();
  },

  logout() {
    window.auth.logoutUser();
  }
};