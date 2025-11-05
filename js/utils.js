/**
 * Utility functions for EDU_AID Front-End.
 * Handles input validation, DOM manipulation, and API error handling.
 * Supports thesis Objective 1 (collect/analyze scores) and Objective 2 (chatbot interaction).
 */

/**
 * Validates if a score is a number between 0 and 100.
 * @param {string} score - Input score as string.
 * @returns {boolean} True if valid, false otherwise.
 */
function isValidScore(score) {
    const num = parseFloat(score);
    return !isNaN(num) && num >= 0 && num <= 100;
}

/**
 * Creates a chat message element (bot or user).
 * @param {string} text - Message text.
 * @param {string} type - 'bot' or 'user' for styling.
 * @returns {HTMLElement} Message element.
 */
function createChatMessage(text, type) {
    const div = document.createElement('div');
    div.className = `chat-message ${type}-message p-2 rounded mb-2`;
    div.textContent = text;
    return div;
}

/**
 * Displays an error message in the specified container.
 * @param {string} containerId - ID of container (e.g., 'form-messages').
 * @param {string} message - Error message.
 */
function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '';
        const error = document.createElement('p');
        error.className = 'error-message';
        error.textContent = message;
        container.appendChild(error);
    }
}

/**
 * Clears error messages from a container.
 * @param {string} containerId - ID of container.
 */
function clearErrors(containerId) {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';
}

/**
 * Makes an API request with error handling.
 * @param {string} url - API endpoint.
 * @param {object} options - Fetch options (method, headers, body).
 * @returns {Promise<object>} API response data.
 * @throws {Error} On API failure.
 */
async function makeApiRequest(url, options) {
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'API request failed');
        }
        return data;
    } catch (error) {
        throw new Error(error.message || 'Network error');
    }
}