/**
 * Animation functions for EDU_AID chatbot UI.
 * Implements typing effect, fade-in, and progress bar animations.
 * Supports thesis Objective 2 (interactive chatbot UI).
 */

/**
 * Displays a text message with a typing effect.
 * @param {string} containerId - ID of chat container.
 * @param {string} text - Message to display.
 * @param {string} type - 'bot' or 'user' for styling.
 * @param {function} callback - Optional callback after typing.
 */
function typeMessage(containerId, text, type, callback) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const message = createChatMessage('', type);
    container.appendChild(message);
    let i = 0;

    function type() {
        if (i < text.length) {
            message.textContent += text.charAt(i);
            i++;
            setTimeout(type, 50); // 50ms delay per character
        } else if (callback) {
            callback();
        }
    }
    type();
}

/**
 * Shows progress bar animation during API calls.
 * @param {string} barId - ID of progress bar container.
 * @param {function} callback - Callback after animation completes.
 */
function showProgressBar(barId, callback) {
    const bar = document.getElementById(barId);
    const inner = bar.querySelector('div');
    if (!bar || !inner) return;

    bar.classList.remove('hidden');
    inner.style.width = '0%';
    inner.classList.add('progress-bar-inner');
    let width = 0;

    const interval = setInterval(() => {
        width += 10;
        inner.style.width = `${width}%`;
        if (width >= 100) {
            clearInterval(interval);
            bar.classList.add('hidden');
            if (callback) callback();
        }
    }, 200); // 2s total animation
}