
const PDFDocument = require('pdfkit');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const analyzer = require('../services/ai_analyzer');      // ← Use AI analyzer
const analysisCache = require('../utils/analysisCache');

// ---------- Multer config (unchanged) ----------
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'].includes(
      path.extname(file.originalname).toLowerCase()
    );
    cb(null, allowed);
  },
});

// ---------- MAIN ANALYSIS ENDPOINT ----------
router.post('/analyze', upload.single('file'), async (req, res) => {
  let tempFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please upload an Excel (.xlsx, .xls) or CSV file.',
      });
    }

    tempFilePath = req.file.path;
    console.log(`Analyzing file: ${req.file.originalname}`);
    console.log(`File path: ${tempFilePath}`);

    // -------------------------------------------------
    // 1. Run the analyzer → gets totalStudents, etc.
    // -------------------------------------------------
    const analysis = await analyzer.analyzeFile(
      tempFilePath,
      req.file.originalname
    );

    console.log('Analysis result structure:', JSON.stringify(analysis, null, 2));

    // -------------------------------------------------
    // 2. Session + cache
    // -------------------------------------------------
    const sessionId = crypto.randomUUID();
    analysisCache.set(sessionId, analysis); // cache the whole object

    // -------------------------------------------------
    // 3. Clean up uploaded file
    // -------------------------------------------------
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    // -------------------------------------------------
    // 4. SEND RESPONSE (complete analysis data)
    // -------------------------------------------------
    const aiPowered = analysis.analysisResults?.aiPowered !== false;
    
    res.json({
      success: true,
      sessionId,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      totalStudents: analysis.totalStudents,
      totalSubjects: analysis.totalSubjects,
      analysisResults: analysis.analysisResults,  // Complete AI analysis
      overallAssessment: analysis.analysisResults?.overallAssessment,
      individualInsights: analysis.analysisResults?.individualInsights,
      patterns: analysis.analysisResults?.patterns,
      recommendations: analysis.analysisResults?.recommendations,
      insights: analysis.analysisResults?.insights,
      confidence: analysis.analysisResults?.confidence,
      aiPowered: aiPowered,
      analysisType: aiPowered ? 'AI-Powered (Gemini 2.5)' : 'Rule-Based (Fallback)',
      message: aiPowered 
        ? 'File analyzed successfully with AI! You can now ask questions about this analysis or download a PDF report.'
        : 'File analyzed with rule-based system. Configure GEMINI_API_KEY for AI-powered insights. You can still download a PDF report.',
      timestamp: analysis.timestamp || new Date().toISOString(),
      downloadUrl: `/api/analysis/download-pdf/${sessionId}`
    });
  } catch (error) {
    console.error('Analysis error:', error);

    // Clean up on error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    res.status(500).json({
      success: false,
      error: error.message,
      hint:
        'Make sure your file contains valid student data with columns like: Full Name, Subject, SS1_1st, SS1_2nd, …',
    });
  }
});

// ---------- CACHE HELPERS ----------
router.getAnalysisCache = () => analysisCache;

// ---------- GET SESSION ----------
router.get('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!analysisCache.has(sessionId)) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const data = analysisCache.get(sessionId);
    res.json({
      success: true,
      sessionId,
      timestamp: data.timestamp,
      totalStudents: data.totalStudents,
      totalSubjects: data.totalSubjects,
      hasData: true,
    });
  } catch (err) {
    console.error('Get session error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------- HEALTH ----------
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'analysis',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// PDF Download endpoint
router.get('/download-pdf/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!analysisCache.has(sessionId)) {
            return res.status(404).json({
                success: false,
                error: 'Analysis session not found'
            });
        }

        const sessionData = analysisCache.get(sessionId);
        const analysisResults = sessionData.data || sessionData;

        // Generate PDF
        const pdfBuffer = await generateAnalysisPDF(analysisResults, sessionId);

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="analysis-report-${sessionId.substring(0, 8)}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        res.send(pdfBuffer);
    } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate PDF report'
        });
    }
});

// Function to generate PDF from analysis results
async function generateAnalysisPDF(analysisResults, sessionId) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // PDF Header
            doc.fontSize(24)
               .font('Helvetica-Bold')
               .text('EDU-AID Analysis Report', { align: 'center' });

            doc.moveDown();
            doc.fontSize(12)
               .font('Helvetica')
               .text(`Report ID: ${sessionId}`, { align: 'right' })
               .text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });

            doc.moveDown(2);

            // Overall Assessment
            if (analysisResults.analysisResults?.overallAssessment) {
                const overall = analysisResults.analysisResults.overallAssessment;
                
                doc.fontSize(18)
                   .font('Helvetica-Bold')
                   .text('Overall Assessment');

                doc.moveDown();
                doc.fontSize(12)
                   .font('Helvetica')
                   .text(`Class Grade: ${overall.classGrade || 'N/A'}`)
                   .text(`Average Score: ${overall.averageScore || 'N/A'}`)
                   .text(`Total Students: ${analysisResults.totalStudents || 'N/A'}`)
                   .text(`Total Subjects: ${analysisResults.totalSubjects || 'N/A'}`);

                if (overall.summary) {
                    doc.moveDown();
                    doc.text(`Summary: ${overall.summary}`);
                }
            }

            doc.moveDown(2);

            // Key Insights
            if (analysisResults.analysisResults?.insights?.length > 0) {
                doc.fontSize(18)
                   .font('Helvetica-Bold')
                   .text('Key Insights');

                doc.moveDown();
                doc.fontSize(12)
                   .font('Helvetica');

                analysisResults.analysisResults.insights.forEach((insight, index) => {
                    doc.text(`${index + 1}. ${insight}`);
                    doc.moveDown(0.5);
                });
            }

            doc.moveDown(2);

            // Recommendations
            if (analysisResults.analysisResults?.recommendations) {
                const recommendations = analysisResults.analysisResults.recommendations;

                doc.fontSize(18)
                   .font('Helvetica-Bold')
                   .text('Recommendations');

                // Immediate Actions
                if (recommendations.immediate?.length > 0) {
                    doc.moveDown();
                    doc.fontSize(14)
                       .font('Helvetica-Bold')
                       .text('Immediate Actions:');
                    
                    doc.fontSize(12)
                       .font('Helvetica');
                    
                    recommendations.immediate.forEach((action, index) => {
                        doc.text(`• ${action}`);
                    });
                }

                // Short Term Actions
                if (recommendations.shortTerm?.length > 0) {
                    doc.moveDown();
                    doc.fontSize(14)
                       .font('Helvetica-Bold')
                       .text('Short Term Actions:');
                    
                    doc.fontSize(12)
                       .font('Helvetica');
                    
                    recommendations.shortTerm.forEach((action, index) => {
                        doc.text(`• ${action}`);
                    });
                }

                // Long Term Actions
                if (recommendations.longTerm?.length > 0) {
                    doc.moveDown();
                    doc.fontSize(14)
                       .font('Helvetica-Bold')
                       .text('Long Term Actions:');
                    
                    doc.fontSize(12)
                       .font('Helvetica');
                    
                    recommendations.longTerm.forEach((action, index) => {
                        doc.text(`• ${action}`);
                    });
                }
            }

            doc.moveDown(2);

            // Individual Student Insights with Course Recommendations
            if (analysisResults.analysisResults?.individualInsights?.length > 0) {
                doc.fontSize(18)
                   .font('Helvetica-Bold')
                   .text('Individual Student Course Recommendations');

                doc.moveDown();
                
                const insights = analysisResults.analysisResults.individualInsights;
                const maxStudentsInPdf = 20; // Limit to prevent PDF from being too large
                
                insights.slice(0, maxStudentsInPdf).forEach((student, index) => {
                    // Add new page for each student (except first)
                    if (index > 0) {
                        doc.addPage();
                    }
                    
                    // Student Header
                    doc.fontSize(16)
                       .font('Helvetica-Bold')
                       .text(`Student: ${student.studentName || `Student ${index + 1}`}`);
                    
                    doc.moveDown(0.5);
                    
                    // Performance Summary
                    doc.fontSize(12)
                       .font('Helvetica')
                       .text(`Average Score: ${student.averageScore || 'N/A'}%`);
                    
                    if (student.strengths && student.strengths.length > 0) {
                        doc.text(`Top Strengths: ${student.strengths.join(', ')}`);
                    }
                    
                    if (student.insight) {
                        doc.moveDown(0.5);
                        doc.fontSize(11)
                           .font('Helvetica-Oblique')
                           .text(`Insight: ${student.insight}`);
                    }
                    
                    doc.moveDown();
                    
                    // Course Recommendations
                    const courseRecommendations = student.courseRecommendations || student.recommendations || [];
                    
                    if (courseRecommendations.length > 0) {
                        doc.fontSize(14)
                           .font('Helvetica-Bold')
                           .text('Recommended University Courses:');
                        
                        doc.moveDown(0.5);
                        
                        courseRecommendations.forEach((course, courseIndex) => {
                            if (typeof course === 'string') {
                                // Handle simple string recommendations
                                doc.fontSize(11)
                                   .font('Helvetica')
                                   .text(`${courseIndex + 1}. ${course}`);
                            } else if (typeof course === 'object' && course.course) {
                                // Handle detailed course object
                                doc.fontSize(12)
                                   .font('Helvetica-Bold')
                                   .text(`${courseIndex + 1}. ${course.course}`);
                                
                                doc.fontSize(11)
                                   .font('Helvetica');
                                
                                if (course.university) {
                                    doc.text(`   Universities: ${course.university}`);
                                }
                                
                                if (course.reason) {
                                    doc.text(`   Why: ${course.reason}`);
                                }
                                
                                if (course.jamb_cutoff) {
                                    doc.text(`   JAMB Cutoff: ${course.jamb_cutoff}`);
                                }
                                
                                if (course.waec_required) {
                                    doc.text(`   WAEC Requirements: ${course.waec_required}`);
                                }
                                
                                doc.moveDown(0.5);
                            }
                        });
                    } else {
                        doc.fontSize(11)
                           .font('Helvetica-Oblique')
                           .text('No specific course recommendations available.');
                    }
                });
                
                if (insights.length > maxStudentsInPdf) {
                    doc.addPage();
                    doc.fontSize(12)
                       .font('Helvetica-Oblique')
                       .text(`Note: This report includes ${maxStudentsInPdf} of ${insights.length} students. Please contact your administrator for the complete analysis.`);
                }
            }

            // Footer
            doc.moveDown(2);
            doc.fontSize(10)
               .font('Helvetica')
               .fillColor('#666666')
               .text('Generated by EDU-AID - Educational AI Analysis Platform', {
                   align: 'center'
               });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = router;