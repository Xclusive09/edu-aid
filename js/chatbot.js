/**
 * Chatbot logic for EDU_AID.
 * Handles stream selection, score input, API calls to /recommend, and recommendation display.
 * Supports thesis Objectives 1-5: score collection (1), chatbot UI (2), recommendations (3),
 * reasoning (4), and reducing course mismatch (5, H1 hypothesis).
 */

const SUBJECTS = {
    science: ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology'],
    management: ['English', 'Mathematics', 'Economics', 'Commerce', 'Government', 'Accounting'],
    arts: ['English', 'Mathematics', 'Literature in English', 'History', 'Civic Education', 'CRS/IRS']
};

/**
 * Initializes chatbot: sets up stream selection and form handling.
 */
function initChatbot() {
    const streamSelect = document.getElementById('stream');
    const scoreForm = document.getElementById('score-form');
    const scoreInputs = document.getElementById('score-inputs');
    const recommendations = document.getElementById('recommendations');
    const restartBtn = document.getElementById('restart-btn');

    if (!streamSelect || !scoreForm || !scoreInputs || !recommendations || !restartBtn) return;

    // Handle stream selection
    streamSelect.addEventListener('change', () => {
        const stream = streamSelect.value;
        if (stream) {
            typeMessage('chat-container', `Great! Enter your ${stream} subject scores (0-100):`, 'bot', () => {
                scoreForm.classList.remove('hidden');
                scoreInputs.innerHTML = '';
                SUBJECTS[stream].forEach(subject => {
                    const div = document.createElement('div');
                    div.innerHTML = `
                        <label for="${subject}" class="block text-gray-700" aria-label="Enter ${subject} score">${subject}</label>
                        <input type="number" id="${subject}" name="${subject}" required min="0" max="100"
                               class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                               aria-required="true" placeholder="Score (0-100)">
                    `;
                    scoreInputs.appendChild(div);
                });
            });
        }
    });

    // Handle score submission
    scoreForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors('chat-container');
        const stream = streamSelect.value;
        const scores = {};
        let valid = true;

        SUBJECTS[stream].forEach(subject => {
            const input = scoreForm.querySelector(`#${subject}`);
            if (!isValidScore(input.value)) {
                valid = false;
                showError('chat-container', `Invalid score for ${subject}. Must be 0-100.`);
            }
            scores[subject] = parseFloat(input.value);
        });

        if (valid) {
            typeMessage('chat-container', 'Processing your scores...', 'bot', async () => {
                showProgressBar('progress-bar', async () => {
                    try {
                        const data = await makeApiRequest('/api/recommend', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            },
                            body: JSON.stringify({ stream, scores })
                        });
                        displayRecommendations(data.recommendations);
                    } catch (error) {
                        showError('chat-container', error.message);
                    }
                });
            });
        }
    });

    // Handle restart
    restartBtn.addEventListener('click', () => {
        scoreForm.classList.add('hidden');
        recommendations.classList.add('hidden');
        streamSelect.value = '';
        scoreInputs.innerHTML = '';
        typeMessage('chat-container', 'Let’s start over! Select your stream:', 'bot');
    });
}

/**
 * Displays recommendations in a table.
 * @param {Array} recommendations - Array of {course, reason, jamb_eligible}.
 */
function displayRecommendations(recommendations) {
    const tableBody = document.getElementById('recommendations-table');
    const recommendationsDiv = document.getElementById('recommendations');
    if (!tableBody || !recommendationsDiv) return;

    tableBody.innerHTML = '';
    recommendations.forEach(rec => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="border p-2">${rec.course}</td>
            <td class="border p-2">${rec.reason}</td>
            <td class="border p-2">${rec.jamb_eligible ? 'Yes' : 'No'}</td>
        `;
        tableBody.appendChild(row);
    });
    recommendationsDiv.classList.remove('hidden');
    typeMessage('chat-container', 'Here are your recommended courses:', 'bot');
}