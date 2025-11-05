import { api } from './api.js';

let currentAnalysis = null;

export function initializeFileUpload() {
    const fileInput = document.getElementById('file-input');
    const uploadForm = document.getElementById('upload-form');
    const analysisSection = document.getElementById('analysis-section');
    const loadingIndicator = document.getElementById('loading');
    
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = fileInput.files[0];
        if (!file) return;

        try {
            loadingIndicator.style.display = 'block';
            analysisSection.innerHTML = 'Analyzing...';

            // Upload and analyze file
            const analysis = await api.analyzeFile(file);
            currentAnalysis = analysis;

            // Get AI insights
            const aiAnalysis = await api.getAIAnalysis(analysis);

            // Display results
            displayAnalysisResults(analysis, aiAnalysis);

            // Show download buttons
            if (aiAnalysis.downloads) {
                displayDownloadOptions(aiAnalysis.downloads);
            }

        } catch (error) {
            console.error('Analysis failed:', error);
            analysisSection.innerHTML = `Error: ${error.message}`;
        } finally {
            loadingIndicator.style.display = 'none';
        }
    });
}

function displayAnalysisResults(analysis, aiAnalysis) {
    const analysisSection = document.getElementById('analysis-section');
    
    analysisSection.innerHTML = `
        <div class="analysis-container">
            <h2>Analysis Results</h2>
            <div class="insights-section">
                <h3>Key Insights</h3>
                <ul>
                    ${aiAnalysis.insights.map(insight => `<li>${insight}</li>`).join('')}
                </ul>
            </div>
            
            <div class="recommendations-section">
                <h3>Recommendations</h3>
                <ul>
                    ${aiAnalysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
            
            <div class="individual-analyses">
                <h3>Individual Student Analysis</h3>
                ${analysis.individualAnalyses.map(student => `
                    <div class="student-analysis">
                        <h4>${student.name}</h4>
                        <p><strong>Strengths:</strong> ${student.analysis.strengths.join(', ')}</p>
                        <p><strong>Recommended Courses:</strong> ${student.analysis.recommendedCourses.join(', ')}</p>
                        <p><strong>Required JAMB Subjects:</strong> ${student.analysis.requiredSubjects.join(', ')}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function displayDownloadOptions(downloads) {
    const downloadSection = document.getElementById('download-section');
    downloadSection.innerHTML = `
        <div class="download-options">
            <h3>Download Reports</h3>
            <button onclick="window.location.href='${downloads.excel}'">Download Excel Report</button>
            <button onclick="window.location.href='${downloads.pdf}'">Download PDF Report</button>
        </div>
    `;
}