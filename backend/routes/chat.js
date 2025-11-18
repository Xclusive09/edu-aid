const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const analysisCache = require('../utils/analysisCache');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Store analysis results from /api/analysis/analyze (now handled by shared cache)
router.post('/store-analysis', (req, res) => {
    try {
        const { sessionId, analysisData } = req.body;
        
        if (!sessionId || !analysisData) {
            return res.status(400).json({
                success: false,
                error: 'Session ID and analysis data are required'
            });
        }

        // Store analysis data
        analysisCache.set(sessionId, analysisData);

        res.json({
            success: true,
            message: 'Analysis data stored successfully',
            sessionId
        });
    } catch (error) {
        console.error('Store analysis error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Chat endpoint with access to analysis results
router.post('/send', async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        // Get analysis data if sessionId is provided
        let analysisContext = null;
        if (sessionId && analysisCache.has(sessionId)) {
            const sessionData = analysisCache.get(sessionId);
            analysisContext = sessionData.data || sessionData;
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048
            }
        });

        // Create context-aware prompt
        const prompt = createChatPrompt(message, analysisContext);

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean any markdown formatting
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        res.json({
            success: true,
            message: text,
            hasAnalysisContext: !!analysisContext,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            hint: 'Check if Gemini API is working properly'
        });
    }
});

// Get available analysis sessions
router.get('/sessions', (req, res) => {
    try {
        const sessions = analysisCache.getAllSessions();

        res.json({
            success: true,
            sessions,
            count: sessions.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Clear analysis cache for a session
router.delete('/session/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (analysisCache.has(sessionId)) {
            analysisCache.delete(sessionId);
            res.json({
                success: true,
                message: 'Session data cleared'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Create context-aware chat prompt
 */
function createChatPrompt(userMessage, analysisContext) {
    const basePrompt = `You are EDU_AID, an intelligent educational assistant specializing in student performance analysis and academic guidance.

Your capabilities include:
- Analyzing student performance data (Excel/CSV files with student grades)
- Providing insights on academic trends and performance patterns
- Recommending Nigerian university courses based on student strengths
- Offering personalized academic guidance and study recommendations
- Answering questions about the EDU_AID system and its features
- Helping with JAMB/WAEC requirements and university admissions

System Features:
- AI-powered analysis using Gemini 2.5 Flash
- Support for SS1-SS3 grade analysis
- Individual student performance insights
- Course recommendations with JAMB cutoffs and WAEC requirements
- PDF report generation
- Real-time chat assistance

Guidelines:
- Be helpful, friendly, and professional
- Provide specific, actionable advice
- Use data-driven insights when available
- Focus on Nigerian educational context
- Keep responses concise but comprehensive
- When asked about system features, explain how EDU_AID works`;

    if (analysisContext) {
        const contextSummary = createAnalysisContextSummary(analysisContext);
        
        return `${basePrompt}

CURRENT ANALYSIS CONTEXT:
${contextSummary}

Based on this analysis data and the user's question below, provide a helpful response that references the specific data when relevant.

USER QUESTION: ${userMessage}

Provide a clear, informative response that addresses their question while incorporating insights from the analysis data when applicable.`;
    } else {
        return `${basePrompt}

USER QUESTION: ${userMessage}

Provide a helpful response. If the question relates to student performance analysis, you may suggest that they upload and analyze their data first for more specific insights.`;
    }
}

/**
 * Create summary of analysis context for the AI
 */
function createAnalysisContextSummary(analysisData) {
    try {
        let summary = '';

        if (analysisData.totalStudents) {
            summary += `- Total Students Analyzed: ${analysisData.totalStudents}\n`;
        }

        if (analysisData.statistics) {
            const stats = analysisData.statistics;
            if (stats.grade) {
                summary += `- Average Grade: ${stats.grade.mean?.toFixed(1)}/100\n`;
                summary += `- Grade Range: ${stats.grade.min?.toFixed(1)} - ${stats.grade.max?.toFixed(1)}\n`;
            }
            if (stats.attendance) {
                summary += `- Average Attendance: ${stats.attendance.mean?.toFixed(1)}%\n`;
            }
        }

        if (analysisData.clusters) {
            const clusters = analysisData.clusters;
            summary += `- High Performers: ${clusters.highPerformers?.length || 0} students\n`;
            summary += `- Need Support: ${clusters.needsSupport?.length || 0} students\n`;
            summary += `- At Risk: ${clusters.atRisk?.length || 0} students\n`;
        }

        if (analysisData.aiInsights) {
            const insights = analysisData.aiInsights;
            if (insights.insights && insights.insights.length > 0) {
                summary += `- Key Insights: ${insights.insights.slice(0, 3).join('; ')}\n`;
            }
            if (insights.concerns && insights.concerns.length > 0) {
                summary += `- Main Concerns: ${insights.concerns.slice(0, 2).join('; ')}\n`;
            }
        }

        return summary || 'Analysis data available but summary could not be generated.';
    } catch (error) {
        console.error('Error creating analysis context summary:', error);
        return 'Analysis data available but could not be processed for context.';
    }
}

module.exports = router;