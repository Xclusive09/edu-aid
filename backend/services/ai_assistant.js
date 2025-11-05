
const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIAssistant {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
        this.conversationHistory = new Map(); // Store conversation history by userId
    }

    /**
     * Process chat message with context
     * @param {string} message - User message
     * @param {Object} context - Analysis context (previous results, etc.)
     * @param {string} userId - User ID for conversation tracking
     * @returns {Object} Response with insights and suggestions
     */
    async processMessage(message, context = {}, userId = 'default') {
        try {
            const prompt = this.buildChatPrompt(message, context, userId);

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Store conversation in history
            this.updateConversationHistory(userId, message, text);

            return this.parseAssistantResponse(text, context);
        } catch (error) {
            console.error('AI Assistant error:', error);
            throw new Error(`AI Assistant failed: ${error.message}`);
        }
    }

    /**
     * Build comprehensive chat prompt
     */
    buildChatPrompt(message, context, userId) {
        const history = this.getConversationHistory(userId);
        const { previousAnalysis, studentData, currentSession } = context;

        return `
You are EDU_AID, an expert educational AI assistant specializing in student performance analysis and educational insights. You help teachers and educators understand their data and make informed decisions.

CONVERSATION CONTEXT:
- User ID: ${userId}
- Previous conversation: ${history.length > 0 ? 'Available' : 'New conversation'}
- Analysis data available: ${previousAnalysis ? 'Yes' : 'No'}
- Student data available: ${studentData ? 'Yes' : 'No'}

${history.length > 0 ? `RECENT CONVERSATION:
${history.slice(-3).map(h => `User: ${h.message}\nAssistant: ${h.response}`).join('\n\n')}` : ''}

${previousAnalysis ? `CURRENT ANALYSIS DATA:
${JSON.stringify(previousAnalysis, null, 2)}` : ''}

USER MESSAGE: ${message}

INSTRUCTIONS:
1. Provide helpful, accurate educational insights
2. Reference specific data when available
3. Offer actionable recommendations
4. Be conversational but professional
5. Ask clarifying questions if needed
6. Provide specific examples when possible

RESPONSE FORMAT:
Please respond in a natural, conversational way. If you have specific insights or recommendations, structure them clearly. If you need more information, ask specific questions.

EDUCATIONAL FOCUS AREAS:
- Student performance analysis
- Learning patterns identification
- Risk factor assessment
- Improvement recommendations
- Data interpretation
- Educational best practices
        `;
    }

    /**
     * Parse assistant response and extract insights
     */
    parseAssistantResponse(text, context) {
        // Extract actionable insights and suggestions
        const insights = this.extractInsights(text);
        const suggestions = this.extractSuggestions(text);

        return {
            message: text,
            insights: insights,
            suggestions: suggestions,
            hasDataReferences: this.hasDataReferences(text),
            followUpQuestions: this.generateFollowUpQuestions(text, context),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Extract insights from response
     */
    extractInsights(text) {
        const insights = [];
        const lines = text.split('\n');

        lines.forEach(line => {
            const lowerLine = line.toLowerCase().trim();
            if (lowerLine.includes('insight:') ||
                lowerLine.includes('finding:') ||
                lowerLine.includes('observation:') ||
                lowerLine.includes('notice that') ||
                lowerLine.includes('indicates that')) {
                insights.push(line.replace(/^[^:]*:?\s*/, '').trim());
            }
        });

        return insights.slice(0, 5); // Limit to 5 insights
    }

    /**
     * Extract suggestions from response
     */
    extractSuggestions(text) {
        const suggestions = [];
        const lines = text.split('\n');

        lines.forEach(line => {
            const lowerLine = line.toLowerCase().trim();
            if (lowerLine.includes('suggest') ||
                lowerLine.includes('recommend') ||
                lowerLine.includes('should consider') ||
                lowerLine.includes('try') ||
                lowerLine.includes('could')) {
                suggestions.push(line.trim());
            }
        });

        return suggestions.slice(0, 3); // Limit to 3 suggestions
    }

    /**
     * Check if response references data
     */
    hasDataReferences(text) {
        const dataKeywords = ['student', 'grade', 'performance', 'score', 'attendance',
            'average', 'analysis', 'data', 'statistics'];
        const lowerText = text.toLowerCase();
        return dataKeywords.some(keyword => lowerText.includes(keyword));
    }

    /**
     * Generate follow-up questions
     */
    generateFollowUpQuestions(text, context) {
        const questions = [];

        if (context.previousAnalysis) {
            if (text.includes('performance') && !text.includes('specific student')) {
                questions.push("Would you like me to analyze specific students who need attention?");
            }
            if (text.includes('trend') && !text.includes('improvement')) {
                questions.push("What specific improvement strategies would you like to explore?");
            }
            if (text.includes('correlation') && !text.includes('why')) {
                questions.push("Would you like me to explain why these patterns might be occurring?");
            }
        } else {
            questions.push("Do you have student performance data you'd like me to analyze?");
        }

        return questions.slice(0, 2); // Limit to 2 follow-up questions
    }

    /**
     * Update conversation history
     */
    updateConversationHistory(userId, message, response) {
        if (!this.conversationHistory.has(userId)) {
            this.conversationHistory.set(userId, []);
        }

        const history = this.conversationHistory.get(userId);
        history.push({
            message,
            response,
            timestamp: new Date().toISOString()
        });

        // Keep only last 10 exchanges to manage memory
        if (history.length > 10) {
            history.splice(0, history.length - 10);
        }
    }

    /**
     * Get conversation history for user
     */
    getConversationHistory(userId) {
        return this.conversationHistory.get(userId) || [];
    }

    /**
     * Clear conversation history for user
     */
    clearConversationHistory(userId) {
        this.conversationHistory.delete(userId);
    }

    /**
     * Get conversation summary
     */
    async getConversationSummary(userId) {
        const history = this.getConversationHistory(userId);
        if (history.length === 0) {
            return "No conversation history available.";
        }

        try {
            const prompt = `
Summarize this conversation between a teacher and EDU_AID educational assistant:

${history.map(h => `Teacher: ${h.message}\nEDU_AID: ${h.response}`).join('\n\n')}

Provide a brief summary highlighting:
1. Main topics discussed
2. Key insights provided
3. Recommendations given
4. Any follow-up actions suggested

Keep the summary concise (2-3 paragraphs).
            `;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Summary generation error:', error);
            return "Unable to generate conversation summary at this time.";
        }
    }

    /**
     * Analyze chat patterns for insights
     */
    analyzeChatPatterns(userId) {
        const history = this.getConversationHistory(userId);
        if (history.length < 3) {
            return null;
        }

        const patterns = {
            totalMessages: history.length,
            averageResponseTime: 'N/A', // Would need timestamps
            commonTopics: this.extractCommonTopics(history),
            questionTypes: this.analyzeQuestionTypes(history),
            engagementLevel: this.assessEngagementLevel(history)
        };

        return patterns;
    }

    /**
     * Extract common topics from conversation
     */
    extractCommonTopics(history) {
        const topics = [];
        const keywords = {
            'performance': ['performance', 'grade', 'score'],
            'attendance': ['attendance', 'absent', 'present'],
            'behavior': ['behavior', 'participation', 'engagement'],
            'improvement': ['improve', 'better', 'help', 'support'],
            'analysis': ['analyze', 'data', 'statistics', 'trend']
        };

        Object.keys(keywords).forEach(topic => {
            let count = 0;
            history.forEach(h => {
                const message = h.message.toLowerCase();
                if (keywords[topic].some(keyword => message.includes(keyword))) {
                    count++;
                }
            });
            if (count > 0) {
                topics.push({ topic, frequency: count });
            }
        });

        return topics.sort((a, b) => b.frequency - a.frequency);
    }

    /**
     * Analyze question types
     */
    analyzeQuestionTypes(history) {
        const types = {
            informational: 0,
            analytical: 0,
            actionable: 0
        };

        history.forEach(h => {
            const message = h.message.toLowerCase();
            if (message.includes('what') || message.includes('how many')) {
                types.informational++;
            } else if (message.includes('why') || message.includes('analyze') || message.includes('pattern')) {
                types.analytical++;
            } else if (message.includes('should') || message.includes('recommend') || message.includes('help')) {
                types.actionable++;
            }
        });

        return types;
    }

    /**
     * Assess user engagement level
     */
    assessEngagementLevel(history) {
        const totalMessages = history.length;
        const avgMessageLength = history.reduce((sum, h) => sum + h.message.length, 0) / totalMessages;

        if (avgMessageLength > 100 && totalMessages > 5) {
            return 'high';
        } else if (avgMessageLength > 50 && totalMessages > 3) {
            return 'medium';
        } else {
            return 'low';
        }
    }
}

module.exports = new AIAssistant();