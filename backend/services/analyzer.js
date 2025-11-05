const XLSX = require('xlsx');
const fs = require('fs-extra');
const path = require('path');
const csv = require('csv-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const ss = require('simple-statistics');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash'
});

class EducationAnalyzer {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-2.5-flash"
        });
    }

    /**
     * Main file analysis function
     * @param {string} filePath - Path to the uploaded file
     * @param {string} originalName - Original filename with extension
     * @returns {Object} Complete analysis results
     */
    async analyzeFile(filePath, originalName = null) {
        try {
            // Step 1: Parse the file and extract data
            const rawData = await this.parseFile(filePath, originalName);

            // Step 2: Perform statistical analysis
            const statisticalAnalysis = this.performStatisticalAnalysis(rawData);

            // Step 3: Use Gemini AI for intelligent insights
            const aiInsights = await this.generateAIInsights(rawData, statisticalAnalysis);

            // Step 4: Generate recommendations
            const recommendations = await this.generateRecommendations(rawData, statisticalAnalysis, aiInsights);

            // Step 5: Create performance clusters
            const clusters = this.createPerformanceClusters(rawData);

            return {
                rawData: this.sanitizeData(rawData),
                statistics: statisticalAnalysis,
                aiInsights,
                recommendations,
                clusters,
                summary: await this.generateSummary(rawData, statisticalAnalysis, aiInsights),
                timestamp: new Date().toISOString(),
                totalStudents: rawData.length,
                dataQuality: this.assessDataQuality(rawData)
            };
        } catch (error) {
            console.error('File analysis error:', error);
            throw new Error(`Analysis failed: ${error.message}`);
        }
    }

    /**
     * Parse Excel or CSV file
     * @param {string} filePath - Path to file
     * @param {string} originalName - Original filename with extension
     * @returns {Array} Parsed student data
     */
    async parseFile(filePath, originalName = null) {
        console.log(`parseFile called with filePath: ${filePath}, originalName: ${originalName}`);
        
        let ext;
        if (originalName) {
            // Use original filename for extension detection
            ext = path.extname(originalName).toLowerCase();
            console.log(`Using original filename extension: ${ext} from ${originalName}`);
        } else {
            // Fallback to file path
            ext = path.extname(filePath).toLowerCase();
            console.log(`Using file path extension: ${ext} from ${filePath}`);
        }
        
        console.log(`Final detected extension: ${ext}`);

        // Support common Excel and CSV formats
        if (ext === '.csv') {
            console.log('Processing as CSV file');
            return this.parseCSV(filePath);
        } else if (ext === '.xlsx' || ext === '.xls' || ext === '.xlsm') {
            console.log('Processing as Excel file');
            return this.parseExcel(filePath);
        } else {
            const error = `Unsupported file format: "${ext}". Please upload Excel (.xlsx, .xls) or CSV (.csv) files.`;
            console.error(error);
            throw new Error(error);
        }
    }

    /**
     * Parse CSV file
     */
    async parseCSV(filePath) {
        return new Promise((resolve, reject) => {
            const data = [];
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    const normalizedRow = this.normalizeStudentData(row);
                    if (normalizedRow) data.push(normalizedRow);
                })
                .on('end', () => resolve(data))
                .on('error', reject);
        });
    }

    /**
     * Parse Excel file
     */
    parseExcel(filePath) {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        return jsonData.map(row => this.normalizeStudentData(row)).filter(Boolean);
    }

    /**
     * Normalize student data from different formats
     */
    normalizeStudentData(row) {
        const normalized = {};

        // Common field mappings (case insensitive)
        const fieldMappings = {
            name: ['name', 'student_name', 'studentname', 'full_name', 'student'],
            id: ['id', 'student_id', 'studentid', 'roll_no', 'rollno'],
            grade: ['grade', 'score', 'marks', 'total_marks', 'final_grade', 'overall_grade'],
            attendance: ['attendance', 'attendance_rate', 'attendance_percentage'],
            participation: ['participation', 'participation_score', 'class_participation'],
            assignment: ['assignment', 'assignment_score', 'assignments'],
            exam: ['exam', 'exam_score', 'final_exam', 'midterm'],
            quiz: ['quiz', 'quiz_score', 'quizzes'],
            subject: ['subject', 'course', 'class', 'subject_name']
        };

        // Map fields
        Object.keys(row).forEach(key => {
            const lowerKey = key.toLowerCase().replace(/\s+/g, '_');

            Object.keys(fieldMappings).forEach(normalizedKey => {
                if (fieldMappings[normalizedKey].includes(lowerKey)) {
                    normalized[normalizedKey] = row[key];
                }
            });
        });

        // Validate essential fields
        if (!normalized.name && !normalized.id) {
            return null; // Skip rows without student identifier
        }

        // Convert numeric fields
        ['grade', 'attendance', 'participation', 'assignment', 'exam', 'quiz'].forEach(field => {
            if (normalized[field] !== undefined) {
                const numValue = parseFloat(String(normalized[field]).replace(/[^\d.-]/g, ''));
                normalized[field] = isNaN(numValue) ? null : numValue;
            }
        });

        return normalized;
    }

    /**
     * Perform statistical analysis on the data
     */
    performStatisticalAnalysis(data) {
        if (!data || data.length === 0) {
            throw new Error('No valid data to analyze');
        }

        const numericFields = ['grade', 'attendance', 'participation', 'assignment', 'exam', 'quiz'];
        const statistics = {};

        numericFields.forEach(field => {
            const values = data
                .map(student => student[field])
                .filter(val => val !== null && val !== undefined && !isNaN(val));

            if (values.length > 0) {
                statistics[field] = {
                    count: values.length,
                    mean: ss.mean(values),
                    median: ss.median(values),
                    mode: ss.mode(values),
                    standardDeviation: ss.standardDeviation(values),
                    variance: ss.variance(values),
                    min: ss.min(values),
                    max: ss.max(values),
                    range: ss.max(values) - ss.min(values),
                    quartiles: {
                        q1: ss.quantile(values, 0.25),
                        q2: ss.quantile(values, 0.5),
                        q3: ss.quantile(values, 0.75)
                    }
                };
            }
        });

        return {
            ...statistics,
            totalStudents: data.length,
            correlations: this.calculateCorrelations(data, numericFields),
            trends: this.identifyTrends(data, numericFields),
            outliers: this.identifyOutliers(data, numericFields)
        };
    }

    /**
     * Calculate correlations between different metrics
     */
    calculateCorrelations(data, fields) {
        const correlations = {};

        for (let i = 0; i < fields.length; i++) {
            for (let j = i + 1; j < fields.length; j++) {
                const field1 = fields[i];
                const field2 = fields[j];

                const pairs = data
                    .map(student => [student[field1], student[field2]])
                    .filter(([val1, val2]) =>
                        val1 !== null && val1 !== undefined && !isNaN(val1) &&
                        val2 !== null && val2 !== undefined && !isNaN(val2)
                    );

                if (pairs.length > 1) {
                    const values1 = pairs.map(pair => pair[0]);
                    const values2 = pairs.map(pair => pair[1]);

                    try {
                        correlations[`${field1}_${field2}`] = ss.sampleCorrelation(values1, values2);
                    } catch (error) {
                        correlations[`${field1}_${field2}`] = null;
                    }
                }
            }
        }

        return correlations;
    }

    /**
     * Identify performance trends
     */
    identifyTrends(data, fields) {
        const trends = {};

        fields.forEach(field => {
            const values = data
                .map(student => student[field])
                .filter(val => val !== null && val !== undefined && !isNaN(val));

            if (values.length > 2) {
                const indices = values.map((_, i) => i);
                try {
                    const regression = ss.linearRegression(indices.map((x, i) => [x, values[i]]));
                    trends[field] = {
                        slope: regression.m,
                        intercept: regression.b,
                        direction: regression.m > 0 ? 'increasing' : regression.m < 0 ? 'decreasing' : 'stable'
                    };
                } catch (error) {
                    trends[field] = null;
                }
            }
        });

        return trends;
    }

    /**
     * Identify statistical outliers
     */
    identifyOutliers(data, fields) {
        const outliers = {};

        fields.forEach(field => {
            const values = data
                .map((student, index) => ({ value: student[field], index, student }))
                .filter(item => item.value !== null && item.value !== undefined && !isNaN(item.value));

            if (values.length > 4) {
                const nums = values.map(item => item.value);
                const q1 = ss.quantile(nums, 0.25);
                const q3 = ss.quantile(nums, 0.75);
                const iqr = q3 - q1;
                const lowerBound = q1 - 1.5 * iqr;
                const upperBound = q3 + 1.5 * iqr;

                outliers[field] = values
                    .filter(item => item.value < lowerBound || item.value > upperBound)
                    .map(item => ({
                        studentName: item.student.name || item.student.id,
                        value: item.value,
                        type: item.value < lowerBound ? 'low' : 'high'
                    }));
            }
        });

        return outliers;
    }

    /**
     * Generate AI insights using Gemini
     */
    async generateAIInsights(data, statistics) {
        try {
            const prompt = this.createAnalysisPrompt(data, statistics);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return this.parseAIResponse(text);
        } catch (error) {
            console.error('AI insights generation error:', error);
            return {
                insights: ['AI analysis temporarily unavailable'],
                keyFindings: [],
                patterns: []
            };
        }
    }

    /**
     * Create prompt for Gemini AI analysis
     */
    createAnalysisPrompt(data, statistics) {
        const summary = {
            totalStudents: data.length,
            hasGrades: statistics.grade ? true : false,
            hasAttendance: statistics.attendance ? true : false,
            gradeStats: statistics.grade || null,
            attendanceStats: statistics.attendance || null,
            correlations: statistics.correlations || {},
            outliers: statistics.outliers || {}
        };

        return `
As an educational data analyst, analyze this student performance data and provide insights:

DATA SUMMARY:
- Total Students: ${summary.totalStudents}
- Grade Statistics: ${summary.gradeStats ? JSON.stringify(summary.gradeStats, null, 2) : 'Not available'}
- Attendance Statistics: ${summary.attendanceStats ? JSON.stringify(summary.attendanceStats, null, 2) : 'Not available'}
- Key Correlations: ${JSON.stringify(summary.correlations, null, 2)}

ANALYSIS REQUIREMENTS:
1. Identify 3-5 key insights about student performance
2. Highlight concerning patterns or trends
3. Note positive trends and achievements
4. Analyze correlations between different metrics
5. Identify students who might need additional support

Please provide your analysis in JSON format:
{
    "insights": ["insight 1", "insight 2", ...],
    "keyFindings": ["finding 1", "finding 2", ...],
    "patterns": [{"type": "pattern_type", "description": "pattern description", "significance": "high/medium/low"}],
    "concerns": ["concern 1", "concern 2", ...],
    "positives": ["positive 1", "positive 2", ...]
}
        `;
    }

    /**
     * Parse AI response
     */
    parseAIResponse(text) {
        try {
            // Try to extract JSON from the response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            // Fallback: parse text response
            return {
                insights: [text],
                keyFindings: [],
                patterns: [],
                concerns: [],
                positives: []
            };
        } catch (error) {
            return {
                insights: [text],
                keyFindings: [],
                patterns: [],
                concerns: [],
                positives: []
            };
        }
    }

    /**
     * Generate recommendations using AI
     */
    async generateRecommendations(data, statistics, aiInsights) {
        try {
            const prompt = `
Based on the following educational data analysis, provide specific, actionable recommendations:

STATISTICS: ${JSON.stringify(statistics, null, 2)}
AI INSIGHTS: ${JSON.stringify(aiInsights, null, 2)}

Provide recommendations in JSON format:
{
    "immediate": ["action 1", "action 2", ...],
    "shortTerm": ["action 1", "action 2", ...],
    "longTerm": ["action 1", "action 2", ...],
    "interventions": [{"student": "name", "recommendation": "specific action"}]
}
            `;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return this.generateFallbackRecommendations(statistics, aiInsights);
        } catch (error) {
            console.error('AI recommendations generation error:', error);
            return this.generateFallbackRecommendations(statistics, aiInsights);
        }
    }

    /**
     * Generate fallback recommendations
     */
    generateFallbackRecommendations(statistics, aiInsights) {
        const recommendations = {
            immediate: [],
            shortTerm: [],
            longTerm: [],
            interventions: []
        };

        // Grade-based recommendations
        if (statistics.grade) {
            if (statistics.grade.mean < 70) {
                recommendations.immediate.push("Review curriculum difficulty and teaching methods");
                recommendations.shortTerm.push("Implement additional support sessions");
            }
            if (statistics.grade.standardDeviation > 20) {
                recommendations.immediate.push("Address performance disparities between students");
            }
        }

        // Attendance-based recommendations
        if (statistics.attendance && statistics.attendance.mean < 80) {
            recommendations.immediate.push("Investigate attendance issues and implement engagement strategies");
            recommendations.shortTerm.push("Develop attendance improvement plan");
        }

        return recommendations;
    }

    /**
     * Create performance clusters
     */
    createPerformanceClusters(data) {
        const clusters = {
            highPerformers: [],
            averagePerformers: [],
            needsSupport: [],
            atRisk: []
        };

        data.forEach(student => {
            const score = this.calculateOverallScore(student);
            const attendance = student.attendance || 100;

            if (score >= 85 && attendance >= 90) {
                clusters.highPerformers.push({ ...student, overallScore: score });
            } else if (score >= 70 && attendance >= 75) {
                clusters.averagePerformers.push({ ...student, overallScore: score });
            } else if (score >= 50 || attendance >= 60) {
                clusters.needsSupport.push({ ...student, overallScore: score });
            } else {
                clusters.atRisk.push({ ...student, overallScore: score });
            }
        });

        return clusters;
    }

    /**
     * Calculate overall performance score
     */
    calculateOverallScore(student) {
        const weights = { grade: 0.4, attendance: 0.2, participation: 0.2, assignment: 0.1, exam: 0.1 };
        let totalWeight = 0;
        let totalScore = 0;

        Object.keys(weights).forEach(key => {
            if (student[key] !== null && student[key] !== undefined && !isNaN(student[key])) {
                totalScore += student[key] * weights[key];
                totalWeight += weights[key];
            }
        });

        return totalWeight > 0 ? (totalScore / totalWeight) : 0;
    }

    /**
     * Generate executive summary
     */
    async generateSummary(data, statistics, aiInsights) {
        try {
            const prompt = `
Create an executive summary for this educational data analysis:

Total Students: ${data.length}
Key Statistics: ${JSON.stringify(statistics, null, 2)}
AI Insights: ${JSON.stringify(aiInsights, null, 2)}

Provide a concise 2-3 paragraph executive summary highlighting the most important findings and recommendations.
            `;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            return `Analysis completed for ${data.length} students. Key findings include performance metrics and recommendations for improvement.`;
        }
    }

    /**
     * Assess data quality
     */
    assessDataQuality(data) {
        const fields = ['name', 'id', 'grade', 'attendance', 'participation'];
        const quality = {};

        fields.forEach(field => {
            const available = data.filter(student =>
                student[field] !== null &&
                student[field] !== undefined &&
                student[field] !== ''
            ).length;

            quality[field] = {
                availableRecords: available,
                completeness: (available / data.length) * 100
            };
        });

        const overallCompleteness = Object.values(quality)
            .reduce((sum, field) => sum + field.completeness, 0) / fields.length;

        return {
            fields: quality,
            overall: {
                completeness: overallCompleteness,
                rating: overallCompleteness > 80 ? 'Good' : overallCompleteness > 60 ? 'Fair' : 'Poor'
            }
        };
    }

    /**
     * Sanitize data for frontend
     */
    sanitizeData(data) {
        return data.map(student => ({
            ...student,
            // Remove any sensitive information if needed
            id: student.id ? String(student.id).substring(0, 8) + '...' : undefined
        }));
    }
}

module.exports = new EducationAnalyzer();