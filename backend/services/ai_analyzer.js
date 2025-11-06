// services/analyzer.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const XLSX = require('xlsx');

class AIAnalyzer {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️  GEMINI_API_KEY not found. AI features will use fallback analysis.');
      this.genAI = null;
      this.model = null;
    } else {
      try {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Use gemini-1.5-flash model with proper configuration
        this.model = this.genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          generationConfig: { 
            temperature: 0.7, 
            maxOutputTokens: 8192,
            topK: 40,
            topP: 0.95
          }
        });
        console.log('✅ Gemini AI initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Gemini AI:', error.message);
        this.genAI = null;
        this.model = null;
      }
    }
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
  // AI CALL (with better error handling)
  // ------------------------------------------------------------
  async analyzeWithAI(data, context = {}) {
    // Check if AI is available
    if (!this.model) {
      console.log('⚠️  AI model not available, using comprehensive analysis...');
      return this.createComprehensiveAnalysis(data, context);
    }

    try {
      const prompt = this.buildAnalysisPrompt(data, context);
      console.log('📝 Generated prompt length:', prompt.length);
      
      // Set a timeout for the AI request
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI request timeout after 30 seconds')), 30000)
      );
      
      const aiRequest = this.model.generateContent(prompt);
      
      const result = await Promise.race([aiRequest, timeout]);
      const response = await result.response;
      const text = response.text();
      
      console.log('✅ AI response received, length:', text.length);
      console.log('📄 AI response preview:', text.substring(0, 200));
      
      // Check if response is empty or invalid
      if (!text || text.trim().length === 0) {
        console.error('❌ Empty response from Gemini API');
        return this.createComprehensiveAnalysis(data, context);
      }
      
      return this.parseAnalysisResponse(text);
    } catch (error) {
      console.error('❌ AI analysis error:', error.message);
      
      // Log specific error types
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        console.error('🌐 Network error: Cannot connect to Gemini API. Check your internet connection.');
      } else if (error.message.includes('API key')) {
        console.error('🔑 API key error: Check your GEMINI_API_KEY configuration.');
      } else if (error.message.includes('timeout')) {
        console.error('⏱️  Request timeout: AI service took too long to respond.');
      }
      
      console.log('📊 Using comprehensive fallback analysis...');
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
    const classGrade = averageScore >= 80 ? 'A' : 
                       averageScore >= 70 ? 'B' : 
                       averageScore >= 60 ? 'C' : 
                       averageScore >= 50 ? 'D' : 'F';

    // Analyze individual students with real data and generate course recommendations
    const individualInsights = Object.keys(data).map((studentName) => {
      const student = data[studentName];
      const subjectScores = Object.entries(student.subjects || {});
      const studentAvg = subjectScores.length > 0 
        ? subjectScores.reduce((sum, [_, score]) => sum + parseFloat(score), 0) / subjectScores.length
        : 0;

      // Get top 3 strengths (subjects >= 70)
      const strengths = subjectScores
        .filter(([_, score]) => parseFloat(score) >= 70)
        .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
        .slice(0, 3)
        .map(([subject, _]) => subject);

      // Generate course recommendations based on strengths
      const courseRecommendations = this.generateCourseRecommendations(strengths, subjectScores, studentAvg);

      // Generate insight
      const insight = this.generateStudentInsight(strengths, studentAvg, subjectScores);

      return {
        studentName,
        averageScore: studentAvg.toFixed(1),
        strengths,
        insight,
        concerns: subjectScores.filter(([_, score]) => parseFloat(score) < 60).map(([subject, _]) => subject),
        recommendations: courseRecommendations,
        courseRecommendations // Include for detailed view
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

    // Transform to match expected API format
    const studentRecommendations = individualInsights.map(student => ({
      student_id: student.studentName,
      strengths: student.strengths,
      insight: student.insight,
      recommendations: student.courseRecommendations
    }));

    return {
      overallAssessment: {
        classGrade,
        averageScore: averageScore.toFixed(1),
        totalStudents: studentCount,
        summary: `Class of ${studentCount} students shows ${classGrade} performance with ${averageScore.toFixed(1)}% average across ${subjects.size} subjects. University course recommendations generated for all students based on individual strengths.`
      },
      individualInsights,
      studentRecommendations, // Add this for compatibility
      patterns: {
        strengths: strongSubjects.length > 0 ? [`Strong class performance in ${strongSubjects.join(', ')}`] : ['Overall steady performance maintained'],
        weaknesses: weakSubjects.length > 0 ? [`Class struggles with ${weakSubjects.join(', ')}`] : ['No major subject weaknesses identified'],
        trends: [`Average class score: ${averageScore.toFixed(1)}%`, `${studentCount} students analyzed for university readiness`, 'Course recommendations tailored to individual strengths']
      },
      recommendations: {
        immediate: [
          'Review individual student course recommendations',
          'Discuss JAMB preparation strategies with students',
          'Ensure students meet WAEC requirements for recommended courses'
        ],
        shortTerm: [
          'Arrange university career guidance sessions',
          'Connect students with alumni in recommended fields',
          'Organize JAMB/UTME preparation programs'
        ],
        longTerm: [
          'Track student university admissions success',
          'Build partnerships with recommended universities',
          'Develop subject-specific excellence programs'
        ]
      },
      insights: [
        `Class of ${studentCount} students analyzed across ${subjects.size} subjects`,
        `Overall class average: ${averageScore.toFixed(1)}% (${classGrade} grade)`,
        `Personalized university course recommendations provided for all ${studentCount} students`,
        strongSubjects.length > 0 ? `Strongest subjects: ${strongSubjects.join(', ')}` : 'No dominant strong subjects identified',
        `${Math.round((individualInsights.filter(s => parseFloat(s.averageScore) >= 70).length / studentCount) * 100)}% of students performing at or above 70%`
      ],
      confidence: 0.8
    };
  }

  // Generate course recommendations based on student strengths
  generateCourseRecommendations(strengths, subjectScores, average) {
    const recommendations = [];
    const subjectMap = {};
    subjectScores.forEach(([subject, score]) => {
      subjectMap[subject.toLowerCase()] = parseFloat(score);
    });

    // Science-based courses
    if (strengths.some(s => ['Mathematics', 'Physics', 'Chemistry'].includes(s))) {
      if (subjectMap['mathematics'] >= 75 && subjectMap['physics'] >= 70) {
        recommendations.push({
          course: 'Computer Engineering',
          university: 'UNILAG, OAU, FUTA',
          reason: 'Excellent Mathematics and Physics foundation for engineering',
          jamb_cutoff: '260+',
          waec_required: 'Mathematics, Physics, Chemistry, English, (Biology/Further Math)'
        });
      }
      if (subjectMap['chemistry'] >= 70 && subjectMap['biology'] >= 70) {
        recommendations.push({
          course: 'Medicine and Surgery',
          university: 'UI, UCH, UNILAG',
          reason: 'Strong science background suitable for medical studies',
          jamb_cutoff: '280+',
          waec_required: 'Mathematics, Physics, Chemistry, Biology, English'
        });
      }
      if (subjectMap['mathematics'] >= 70) {
        recommendations.push({
          course: 'Mathematics/Statistics',
          university: 'ABU, UNIPORT, UNICAL',
          reason: 'Outstanding mathematical ability and analytical skills',
          jamb_cutoff: '220+',
          waec_required: 'Mathematics, Physics, Chemistry, English, (Economics/Further Math)'
        });
      }
    }

    // Arts/Commercial courses
    if (strengths.some(s => ['Economics', 'Government', 'Literature', 'English'].includes(s))) {
      if (subjectMap['economics'] >= 70) {
        recommendations.push({
          course: 'Economics',
          university: 'UI, UNN, UNIBEN',
          reason: 'Strong economics performance and analytical thinking',
          jamb_cutoff: '240+',
          waec_required: 'Mathematics, Economics, English, Government/Commerce, Any Arts subject'
        });
      }
      if (subjectMap['government'] >= 70 || subjectMap['literature'] >= 70) {
        recommendations.push({
          course: 'Law',
          university: 'UNILAG, UI, ABU',
          reason: 'Excellent performance in humanities and critical thinking',
          jamb_cutoff: '270+',
          waec_required: 'English, Literature, Government, Economics/CRK/History, Mathematics'
        });
      }
      if (subjectMap['english'] >= 75) {
        recommendations.push({
          course: 'Mass Communication',
          university: 'UNILAG, UNIBEN, UNIPORT',
          reason: 'Strong English language and communication skills',
          jamb_cutoff: '250+',
          waec_required: 'English, Literature, Government/Economics, Mathematics, Any Arts subject'
        });
      }
    }

    // Business courses
    if (strengths.some(s => ['Economics', 'Mathematics'].includes(s))) {
      recommendations.push({
        course: 'Business Administration',
        university: 'UNILAG, OAU, UNN',
        reason: 'Good business aptitude with analytical skills',
        jamb_cutoff: '230+',
        waec_required: 'Mathematics, Economics, English, Commerce/Government, Any relevant subject'
      });
    }

    // Ensure we have at least 3 recommendations
    if (recommendations.length < 3) {
      if (average >= 70) {
        recommendations.push({
          course: 'Accounting',
          university: 'UNILAG, UNIBEN, OAU',
          reason: 'Strong academic performance suitable for accounting',
          jamb_cutoff: '240+',
          waec_required: 'Mathematics, Economics, English, Commerce/Government, Any relevant subject'
        });
      }
      if (recommendations.length < 3) {
        recommendations.push({
          course: 'Public Administration',
          university: 'UI, ABU, UNICAL',
          reason: 'Good overall academic performance for public sector studies',
          jamb_cutoff: '210+',
          waec_required: 'English, Government/Economics, Mathematics, Any Arts subjects (2)'
        });
      }
    }

    return recommendations.slice(0, 3);
  }

  // Generate personalized insight for student
  generateStudentInsight(strengths, average, subjectScores) {
    if (average >= 80) {
      return `Exceptional academic performance with consistent excellence in ${strengths.join(', ')}. Strong candidate for competitive university programs.`;
    } else if (average >= 70) {
      return `Solid academic foundation with notable strengths in ${strengths.join(', ')}. Well-positioned for university admission in related fields.`;
    } else if (average >= 60) {
      return `Moderate performance with potential in ${strengths.join(', ')}. Focus on strengthening core subjects for better university prospects.`;
    } else {
      return `Shows promise in ${strengths.length > 0 ? strengths.join(', ') : 'selected areas'}. Requires additional support to improve overall academic standing.`;
    }
  }

  // ------------------------------------------------------------
  // Build the AI prompt for analysis
  // ------------------------------------------------------------
  buildAnalysisPrompt(studentData, context) {
    const studentNames = Object.keys(studentData);
    const totalStudents = context.totalStudents || studentNames.length;
    const totalSubjects = context.totalSubjects || 0;
    
    // Create detailed student data for analysis
    let dataText = '';
    studentNames.forEach((name, index) => {
      const student = studentData[name];
      dataText += `\nStudent ${index + 1} (${name}):\n`;
      Object.entries(student.subjects || {}).forEach(([subject, score]) => {
        dataText += `  ${subject}: ${score}/100\n`;
      });
    });

    return `
You are EDU_AID, an expert Nigerian university course advisor.

Analyze SS1-SS3 results and for EACH student:
- List top 3 strengths (subjects with average score >70)
- Give 1 key insight about their academic performance
- Recommend 3 suitable university courses with:
  • Specific reason based on their strengths
  • Approximate JAMB cutoff score
  • Required WAEC/O'Level subjects

DATASET OVERVIEW:
- Total Students: ${totalStudents}
- Total Subjects: ${totalSubjects}
- File: ${context.fileName || 'Student Performance Data'}

STUDENT DATA:
${dataText}

Return ONLY a valid JSON array (no markdown, no extra text):
[
  {
    "student_id": "Student Name",
    "strengths": ["Subject1", "Subject2", "Subject3"],
    "insight": "Brief insight about student's academic pattern and potential",
    "recommendations": [
      {
        "course": "Course Name",
        "university": "UNILAG, OAU, FUTA",
        "reason": "Why this course fits based on their strengths",
        "jamb_cutoff": "250+",
        "waec_required": "Math, English, Physics, Chemistry"
      },
      {
        "course": "Alternative Course 1",
        "university": "UI, UNN, UNIBEN",
        "reason": "Another suitable option",
        "jamb_cutoff": "240+",
        "waec_required": "Required subjects"
      },
      {
        "course": "Alternative Course 2",
        "university": "ABU, UNIPORT, UNICAL",
        "reason": "Third option based on profile",
        "jamb_cutoff": "230+",
        "waec_required": "Required subjects"
      }
    ]
  }
]

IMPORTANT:
1. Consider Nigerian JAMB and WAEC requirements
2. Match courses to student's strongest subjects
3. Provide realistic JAMB cutoffs (200-300 range)
4. List 2-3 reputable Nigerian universities per course
5. Be specific with WAEC subject requirements (typically 5 subjects including English & Math)
6. Return ONLY the JSON array, no other text
`;
  }

  // ------------------------------------------------------------
  // All the parsing / validation helpers
  // ------------------------------------------------------------
  parseAnalysisResponse(text) {
    try {
      // Clean the response - remove markdown code blocks
      let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      // Try to parse as JSON array
      const parsed = JSON.parse(cleanText);
      
      // If it's an array, transform it to our expected format
      if (Array.isArray(parsed)) {
        return this.transformStudentRecommendations(parsed);
      }
      
      // If it's already in the old format, validate it
      return this.validateAndEnhanceResponse(parsed);
    } catch (error) {
      console.warn('Failed to parse AI response as JSON:', error.message);
      console.warn('Response text:', text.substring(0, 500));
      return this.createStructuredResponse(text);
    }
  }

  // Transform the new student-centric format to frontend-compatible structure
  transformStudentRecommendations(studentArray) {
    const totalStudents = studentArray.length;
    const allScores = [];
    
    // Calculate overall statistics
    studentArray.forEach(student => {
      const avgScore = this.calculateStudentAverage(student);
      if (avgScore > 0) allScores.push(avgScore);
    });
    
    const overallAverage = allScores.length > 0 
      ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length 
      : 70;
    
    const classGrade = overallAverage >= 80 ? 'A' : 
                       overallAverage >= 70 ? 'B' : 
                       overallAverage >= 60 ? 'C' : 
                       overallAverage >= 50 ? 'D' : 'F';

    return {
      overallAssessment: {
        classGrade,
        averageScore: overallAverage.toFixed(1),
        totalStudents,
        summary: `Analysis completed for ${totalStudents} students. Class average: ${overallAverage.toFixed(1)}%. University course recommendations provided for each student based on SS1-SS3 performance.`
      },
      individualInsights: studentArray.map(student => ({
        studentName: student.student_id,
        averageScore: this.calculateStudentAverage(student).toFixed(1),
        strengths: student.strengths || [],
        insight: student.insight || 'Performance data analyzed',
        recommendations: student.recommendations || [],
        courseRecommendations: student.recommendations || [] // Include full course data
      })),
      patterns: this.extractPatterns(studentArray),
      recommendations: this.generateRecommendations(studentArray),
      insights: this.generateInsights(studentArray),
      confidence: 0.9,
      studentRecommendations: studentArray // Keep original format for detailed view
    };
  }

  calculateStudentAverage(student) {
    if (!student.strengths || student.strengths.length === 0) return 75;
    // Estimate average from strengths (subjects > 70)
    return 75; // Conservative estimate
  }

  extractPatterns(studentArray) {
    const allStrengths = [];
    const allWeaknesses = [];
    
    studentArray.forEach(student => {
      if (student.strengths) allStrengths.push(...student.strengths);
    });
    
    // Find most common strengths
    const strengthCounts = {};
    allStrengths.forEach(s => strengthCounts[s] = (strengthCounts[s] || 0) + 1);
    const topStrengths = Object.entries(strengthCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([subject, count]) => `${subject} (${count} students excel)`);
    
    return {
      strengths: topStrengths.length > 0 ? topStrengths : ['Students show diverse academic strengths'],
      weaknesses: ['Individual improvement areas identified per student'],
      trends: [`${studentArray.length} students analyzed for university readiness`, 'Course recommendations tailored to individual strengths']
    };
  }

  generateRecommendations(studentArray) {
    const courseTypes = new Set();
    studentArray.forEach(student => {
      if (student.recommendations) {
        student.recommendations.forEach(rec => {
          if (rec.course) courseTypes.add(rec.course);
        });
      }
    });
    
    return {
      immediate: [
        'Review individual student course recommendations',
        'Discuss JAMB preparation strategies with students',
        'Ensure students meet WAEC requirements for recommended courses'
      ],
      shortTerm: [
        'Arrange university career guidance sessions',
        'Connect students with alumni in recommended fields',
        'Organize JAMB/UTME preparation programs'
      ],
      longTerm: [
        'Track student university admissions success',
        'Build partnerships with recommended universities',
        'Develop subject-specific excellence programs'
      ]
    };
  }

  generateInsights(studentArray) {
    const insights = [
      `Personalized university course recommendations provided for ${studentArray.length} students`,
      'Each student matched with 3 suitable courses based on academic strengths',
      'JAMB cutoff scores and WAEC requirements specified for all recommendations'
    ];
    
    // Count unique courses recommended
    const uniqueCourses = new Set();
    studentArray.forEach(student => {
      if (student.recommendations) {
        student.recommendations.forEach(rec => {
          if (rec.course) uniqueCourses.add(rec.course);
        });
      }
    });
    
    if (uniqueCourses.size > 0) {
      insights.push(`${uniqueCourses.size} different university courses recommended across all students`);
    }
    
    return insights;
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