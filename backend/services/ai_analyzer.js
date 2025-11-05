// services/analyzer.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const XLSX = require('xlsx');

class AIAnalyzer {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use a more stable model version
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-latest',
      generationConfig: { 
        temperature: 0.7, 
        maxOutputTokens: 4096,
        topK: 40,
        topP: 0.95,
        responseMimeType: "application/json"
      }
    });
  }

  // ------------------------------------------------------------
  // PUBLIC ENTRY POINT – called from the route
  // ------------------------------------------------------------
  async analyzeFile(filePath, originalName) {
    console.log('AI Analyzer: Starting file analysis');
    console.log('File path:', filePath);
    console.log('Original name:', originalName);

    try {
      // 1. Read Excel
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      console.log('Excel data loaded, rows count:', rows.length);
      console.log('Sample row:', rows[0]);

      // 2. Count students & subjects (frontend needs these)
      const studentSet = new Set();
      const subjectSet = new Set();

      rows.forEach(row => {
        const name = row['Full Name'] || row.full_name || row.Student_ID || row.student_id;
        const subj = row.Subject || row.subject;
        if (name) studentSet.add(name);
        if (subj) subjectSet.add(subj);
      });

      const totalStudents = studentSet.size;
      const totalSubjects = subjectSet.size;

      console.log('Detected students:', totalStudents);
      console.log('Detected subjects:', totalSubjects);

      // 3. Build the data that will go into the AI prompt
      const studentData = this.aggregateStudentData(rows);
      console.log('Aggregated student data sample:', Object.keys(studentData).slice(0, 3));

      // 4. Call Gemini
      console.log('Calling AI for analysis...');
      const aiResult = await this.analyzeWithAI(studentData, {
        fileName: originalName,
        totalStudents,
        totalSubjects
      });

      console.log('AI analysis completed');
      console.log('AI result structure:', Object.keys(aiResult));

      // 5. Return everything the frontend expects
      const finalResult = {
        totalStudents,
        totalSubjects,
        analysisResults: aiResult,
        timestamp: new Date().toISOString()
      };

      console.log('Final analysis result keys:', Object.keys(finalResult));
      return finalResult;

    } catch (error) {
      console.error('AI Analyzer error:', error);
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  // ------------------------------------------------------------
  // Aggregate raw rows → { studentName: { subject: avgScore } }
  // ------------------------------------------------------------
  aggregateStudentData(rows) {
    const data = {};

    rows.forEach(row => {
      const name = row['Full Name'] || row.full_name || row.Student_ID || row.student_id;
      const subject = row.Subject || row.subject;
      if (!name || !subject) return;

      if (!data[name]) data[name] = { subjects: {} };

      // All possible term columns
      const termCols = [
        'SS1_1st', 'SS1_2nd', 'SS1_3rd',
        'SS2_1st', 'SS2_2nd', 'SS2_3rd',
        'SS3_1st', 'SS3_2nd', 'SS3_3rd',
        // legacy columns (if you still have the old file)
        'SS1_Score', 'SS2_Score', 'SS3_Score'
      ];

      const scores = termCols
        .map(col => parseFloat(row[col]))
        .filter(n => !isNaN(n) && n >= 0);

      if (scores.length) {
        const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
        data[name].subjects[subject] = avg;
      }
    });

    return data;
  }

  // ------------------------------------------------------------
  // AI CALL (kept exactly as you wrote it)
  // ------------------------------------------------------------
  async analyzeWithAI(data, context = {}) {
    try {
      const prompt = this.buildAnalysisPrompt(data, context);
      console.log('Generated prompt length:', prompt.length);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('AI response received, length:', text.length);
      console.log('AI response preview:', text.substring(0, 200));
      
      // Check if response is empty or invalid
      if (!text || text.trim().length === 0) {
        console.error('Empty response from Gemini API');
        return this.createFallbackAnalysis(data, context);
      }
      
      return this.parseAnalysisResponse(text);
    } catch (error) {
      console.error('AI analysis error:', error);
      console.error('Error details:', error.response?.data || error.message);
      console.log('Falling back to comprehensive analysis structure...');
      
      // Return a comprehensive fallback analysis structure
      return this.createComprehensiveAnalysis(data, context);
    }
  }

  createFallbackAnalysis(data, context) {
    const studentCount = Object.keys(data).length;
    const subjects = new Set();
    
    Object.values(data).forEach(student => {
      Object.keys(student.subjects || {}).forEach(subject => subjects.add(subject));
    });

    return {
      overallAssessment: {
        classGrade: 'C',
        averageScore: 70,
        totalStudents: studentCount,
        summary: `Analysis completed for ${studentCount} students across ${subjects.size} subjects. AI analysis temporarily unavailable, showing basic summary.`
      },
      individualInsights: Object.keys(data).slice(0, 10).map((studentName, index) => {
        const student = data[studentName];
        const subjectScores = Object.entries(student.subjects || {});
        const avgScore = subjectScores.length > 0 
          ? subjectScores.reduce((sum, [_, score]) => sum + parseFloat(score), 0) / subjectScores.length
          : 0;

        return {
          studentName,
          averageScore: avgScore.toFixed(1),
          strengths: subjectScores.filter(([_, score]) => parseFloat(score) >= 75).map(([subject, _]) => subject),
          concerns: subjectScores.filter(([_, score]) => parseFloat(score) < 50).map(([subject, _]) => subject),
          recommendations: avgScore < 50 ? ['Needs immediate intervention', 'Additional tutoring recommended'] 
                          : avgScore < 75 ? ['Focus on weaker subjects', 'Regular assessment recommended']
                          : ['Maintain current performance', 'Consider advanced challenges']
        };
      }),
      patterns: {
        strengths: ['Data analysis completed', 'Student performance tracked'],
        weaknesses: ['AI analysis temporarily unavailable'],
        trends: ['Manual analysis provided']
      },
      recommendations: {
        immediate: ['Review student performance data', 'Identify students needing support'],
        shortTerm: ['Implement targeted interventions', 'Regular progress monitoring'],
        longTerm: ['Develop comprehensive improvement strategies', 'Establish performance benchmarks']
      },
      insights: [
        `Analysis completed for ${studentCount} students`,
        `${subjects.size} subjects analyzed`,
        'Detailed AI analysis will be available once service is restored',
        'Basic performance metrics calculated from available data'
      ],
      confidence: 0.6
    };
  }

  createComprehensiveAnalysis(data, context) {
    const studentCount = Object.keys(data).length;
    const subjects = new Set();
    let totalScoreSum = 0;
    let totalScoreCount = 0;
    
    // Calculate real statistics from the data
    Object.values(data).forEach(student => {
      Object.entries(student.subjects || {}).forEach(([subject, score]) => {
        subjects.add(subject);
        totalScoreSum += parseFloat(score);
        totalScoreCount++;
      });
    });

    const averageScore = totalScoreCount > 0 ? (totalScoreSum / totalScoreCount) : 70;
    const classGrade = averageScore >= 80 ? 'B+' : averageScore >= 70 ? 'B' : averageScore >= 60 ? 'C' : 'D';

    // Analyze individual students with real data
    const individualInsights = Object.keys(data).map((studentName) => {
      const student = data[studentName];
      const subjectScores = Object.entries(student.subjects || {});
      const studentAvg = subjectScores.length > 0 
        ? subjectScores.reduce((sum, [_, score]) => sum + parseFloat(score), 0) / subjectScores.length
        : 0;

      return {
        studentName,
        averageScore: studentAvg.toFixed(1),
        strengths: subjectScores.filter(([_, score]) => parseFloat(score) >= 75).map(([subject, _]) => subject),
        concerns: subjectScores.filter(([_, score]) => parseFloat(score) < 60).map(([subject, _]) => subject),
        recommendations: studentAvg < 50 ? ['Needs immediate academic support', 'Schedule parent-teacher meeting'] 
                        : studentAvg < 70 ? ['Focus on weaker subjects', 'Provide additional practice materials']
                        : ['Maintain excellent performance', 'Consider leadership opportunities']
      };
    });

    // Find patterns in the data
    const subjectAverages = {};
    subjects.forEach(subject => {
      const scores = Object.values(data).map(student => parseFloat(student.subjects[subject])).filter(score => !isNaN(score));
      if (scores.length > 0) {
        subjectAverages[subject] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      }
    });

    const strongSubjects = Object.entries(subjectAverages).filter(([_, avg]) => avg >= 75).map(([subject, _]) => subject);
    const weakSubjects = Object.entries(subjectAverages).filter(([_, avg]) => avg < 60).map(([subject, _]) => subject);

    return {
      overallAssessment: {
        classGrade,
        averageScore: averageScore.toFixed(1),
        totalStudents: studentCount,
        summary: `Class of ${studentCount} students shows ${classGrade} performance with ${averageScore.toFixed(1)}% average across ${subjects.size} subjects. ${strongSubjects.length > 0 ? `Strong performance in ${strongSubjects.join(', ')}.` : ''} ${weakSubjects.length > 0 ? `Improvement needed in ${weakSubjects.join(', ')}.` : ''}`
      },
      individualInsights: individualInsights,
      patterns: {
        strengths: strongSubjects.length > 0 ? [`Strong class performance in ${strongSubjects.join(', ')}`] : ['Overall steady performance maintained'],
        weaknesses: weakSubjects.length > 0 ? [`Class struggles with ${weakSubjects.join(', ')}`] : ['No major subject weaknesses identified'],
        trends: [`Average class score: ${averageScore.toFixed(1)}%`, `${subjects.size} subjects covered`, `Performance distribution varies by subject`]
      },
      recommendations: {
        immediate: [
          ...(weakSubjects.length > 0 ? [`Focus teaching resources on ${weakSubjects.join(', ')}`] : []),
          'Review individual student performance for targeted support',
          'Celebrate strong performers to maintain motivation'
        ],
        shortTerm: [
          'Implement subject-specific improvement strategies',
          'Regular progress monitoring and feedback sessions',
          'Peer tutoring program for struggling students'
        ],
        longTerm: [
          'Develop comprehensive curriculum enhancement plan',
          'Teacher professional development in identified weak areas',
          'Establish performance benchmarks and tracking systems'
        ]
      },
      insights: [
        `Class of ${studentCount} students analyzed across ${subjects.size} subjects`,
        `Overall class average: ${averageScore.toFixed(1)}% (${classGrade} grade)`,
        strongSubjects.length > 0 ? `Strongest subjects: ${strongSubjects.join(', ')}` : 'No dominant strong subjects identified',
        weakSubjects.length > 0 ? `Areas needing attention: ${weakSubjects.join(', ')}` : 'No critical weak areas identified',
        `${Math.round((individualInsights.filter(s => parseFloat(s.averageScore) >= 70).length / studentCount) * 100)}% of students performing at or above 70%`
      ],
      confidence: 0.8
    };
  }

  // ------------------------------------------------------------
  // Build the AI prompt for analysis
  // ------------------------------------------------------------
  buildAnalysisPrompt(studentData, context) {
    const studentNames = Object.keys(studentData);
    const totalStudents = context.totalStudents || studentNames.length;
    const totalSubjects = context.totalSubjects || 0;
    
    // Create a summary of the data
    let dataSnippet = '';
    studentNames.slice(0, 5).forEach(name => {
      const student = studentData[name];
      dataSnippet += `\nStudent: ${name}\n`;
      Object.entries(student.subjects || {}).forEach(([subject, score]) => {
        dataSnippet += `  ${subject}: ${score}/100\n`;
      });
    });

    if (studentNames.length > 5) {
      dataSnippet += `\n... and ${studentNames.length - 5} more students\n`;
    }

    return `
You are EDU_AID, an expert educational analyst. Analyze this Nigerian secondary school student performance data and provide comprehensive insights.

DATASET OVERVIEW:
- Total Students: ${totalStudents}
- Total Subjects: ${totalSubjects}
- File: ${context.fileName || 'Student Performance Data'}

SAMPLE DATA:
${dataSnippet}

Please provide a comprehensive analysis in the following JSON format:

{
  "overallAssessment": {
    "classGrade": "A/B/C/D/F",
    "averageScore": numeric_average,
    "totalStudents": ${totalStudents},
    "summary": "2-3 sentence overview of class performance"
  },
  "individualInsights": [
    {
      "studentName": "Student Name",
      "averageScore": "XX.X",
      "strengths": ["subject1", "subject2"],
      "concerns": ["subject3"],
      "recommendations": ["specific advice for this student"]
    }
  ],
  "patterns": {
    "strengths": ["What the class is doing well"],
    "weaknesses": ["Areas needing improvement"],
    "trends": ["Observable patterns in performance"]
  },
  "recommendations": {
    "immediate": ["Actions needed right now"],
    "shortTerm": ["Actions for next 1-2 months"], 
    "longTerm": ["Actions for next semester/year"]
  },
  "insights": [
    "Key insight 1 about student performance",
    "Key insight 2 about subject mastery",
    "Key insight 3 about learning patterns"
  ],
  "confidence": 0.85
}

Focus on:
1. Nigerian educational context (WAEC, JAMB, university preparation)
2. Subject-specific performance patterns
3. Individual student needs and strengths
4. Actionable recommendations for teachers/parents
5. Academic progression and university readiness

Provide specific, data-driven insights that will help improve student outcomes.
`;
  }

  // ------------------------------------------------------------
  // All the parsing / validation helpers
  // ------------------------------------------------------------
  parseAnalysisResponse(text) {
    try {
      // Clean the response
      let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      // Try to parse as JSON
      const parsed = JSON.parse(cleanText);
      return this.validateAndEnhanceResponse(parsed);
    } catch (error) {
      console.warn('Failed to parse AI response as JSON, creating structured response');
      return this.createStructuredResponse(text);
    }
  }

  validateAndEnhanceResponse(response) {
    const validated = {
      overallAssessment: response.overallAssessment || {
        classGrade: 'C',
        averageScore: 70,
        totalStudents: 0,
        summary: 'Analysis completed'
      },
      individualInsights: response.individualInsights || [],
      patterns: response.patterns || {
        strengths: [],
        weaknesses: [],
        trends: []
      },
      recommendations: response.recommendations || {
        immediate: [],
        shortTerm: [],
        longTerm: []
      },
      insights: response.insights || ['Analysis completed successfully']
    };

    // Add confidence score
    validated.confidence = this.calculateConfidence(validated);
    return validated;
  }

  createStructuredResponse(text) {
    // Extract key information from unstructured text
    const lines = text.split('\n').filter(line => line.trim());
    
    return {
      overallAssessment: {
        classGrade: 'C',
        averageScore: 70,
        totalStudents: 0,
        summary: lines[0] || 'Analysis completed'
      },
      individualInsights: [],
      patterns: {
        strengths: this.extractRecommendations(text, 'strength'),
        weaknesses: this.extractRecommendations(text, 'weakness'),
        trends: []
      },
      recommendations: {
        immediate: this.extractRecommendations(text, 'immediate'),
        shortTerm: this.extractRecommendations(text, 'short'),
        longTerm: this.extractRecommendations(text, 'long')
      },
      insights: lines.slice(0, 5),
      confidence: 0.6
    };
  }

  extractRecommendations(text, timeframe) {
    const lowerText = text.toLowerCase();
    const recommendations = [];
    
    const keywords = {
      immediate: ['immediate', 'urgent', 'now', 'asap'],
      short: ['short', 'weeks', 'month'],
      long: ['long', 'semester', 'year'],
      strength: ['strength', 'good', 'excellent', 'strong'],
      weakness: ['weakness', 'poor', 'low', 'concern']
    };

    const lines = text.split('\n');
    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      if (keywords[timeframe]?.some(keyword => lowerLine.includes(keyword))) {
        const cleaned = line.trim().replace(/^[-*•]\s*/, '');
        if (cleaned.length > 10) {
          recommendations.push(cleaned);
        }
      }
    });

    return recommendations.slice(0, 3); // Limit to 3 items
  }

  createFallbackResponse(text) {
    return {
      overallAssessment: {
        classGrade: 'C',
        averageScore: 70,
        totalStudents: 0,
        summary: 'Analysis completed with limited data'
      },
      individualInsights: [],
      patterns: { strengths: [], weaknesses: [], trends: [] },
      recommendations: {
        immediate: ['Review student performance data'],
        shortTerm: ['Implement targeted interventions'],
        longTerm: ['Develop comprehensive improvement plan']
      },
      insights: [text.substring(0, 200) + '...'],
      confidence: 0.3
    };
  }

  calculateConfidence(response) {
    let score = 0;
    
    // Check completeness of response
    if (response.overallAssessment) score += 0.2;
    if (response.individualInsights?.length > 0) score += 0.3;
    if (response.patterns) score += 0.2;
    if (response.recommendations) score += 0.2;
    if (response.insights?.length > 0) score += 0.1;

    return Math.min(score, 1.0);
  }
}

// ---------------------------------------------------------------
// EXPORT ONLY ONE INSTANCE
// ---------------------------------------------------------------
const analyzer = new AIAnalyzer();
module.exports = new AIAnalyzer();   // <-- ONLY THIS LINE