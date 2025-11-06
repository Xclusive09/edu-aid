// Chat functionality for EDU_AID dashboard

let fileToAnalyze = null;
let currentAnalysis = null;

async function handleFileUpload(file) {
    try {
        // Show loading state
        showLoadingState();
        
        // First analyze the file
        const analysisResults = await api.analyzeFile(file);
        currentAnalysis = analysisResults;
        
        // Update UI with initial analysis
        updateAnalysisStats(analysisResults);
        
        // Get AI insights
        const aiAnalysis = await api.getAIAnalysis(analysisResults);
        
        // Display AI insights
        displayAIInsights(aiAnalysis);
        
        // Enable chat interface
        enableChatInterface();
        
        hideLoadingState();
        showSuccessMessage('Analysis complete! You can now ask questions about your data.');
        
    } catch (error) {
        hideLoadingState();
        showErrorMessage(error.message);
    }
}

async function handleChatMessage(message) {
    try {
        const response = await api.sendChatMessage(message, currentAnalysis);
        appendMessage(message, 'user');
        appendMessage(response.response, 'ai');
    } catch (error) {
        showErrorMessage('Failed to get response: ' + error.message);
    }
}