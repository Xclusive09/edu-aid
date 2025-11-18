# EDU-AID Production Deployment Guide

## Overview
This guide explains how to deploy EDU-AID for production use with AI-powered analysis.

## Prerequisites
- Node.js 16+ installed
- npm or yarn package manager
- Gemini API key (required for AI-powered analysis)
- Modern web browser for frontend

## Backend Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the backend directory:
```bash
cp .env.example .env
```

Edit the `.env` file and add your Gemini API key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
PORT=5000
NODE_ENV=production
JWT_SECRET=your_secure_jwt_secret_here
```

**IMPORTANT:** 
- You MUST configure `GEMINI_API_KEY` for production use
- Without it, the system will fall back to rule-based analysis (NOT recommended)
- Get your Gemini API key from: https://makersuite.google.com/app/apikey

### 3. Start the Backend Server
```bash
cd backend
npm start
```

The server will start on `http://localhost:5000` by default.

### 4. Verify AI is Working
Check the server console output:
- ✅ **Good:** `Gemini AI (2.5-flash) initialized successfully - AI-powered analysis ENABLED`
- ❌ **Bad:** `GEMINI_API_KEY not found! AI analysis is DISABLED.`

If you see the error, double-check your `.env` file.

## Frontend Setup

### Option 1: Using Live Server (Development)
1. Install Live Server extension in VS Code
2. Open `frontend/index.html` or `frontend/login.html`
3. Right-click → "Open with Live Server"

### Option 2: Using a Static Server (Production)
```bash
# Using Python
cd frontend
python3 -m http.server 8080

# Using Node.js http-server
npm install -g http-server
cd frontend
http-server -p 8080
```

## Testing the System

### 1. Prepare Test Data
Create an Excel file with the following columns:
- `Full Name` or `Student_ID`
- `Subject`
- `SS1_1st`, `SS1_2nd`, `SS1_3rd` (SS1 term scores)
- `SS2_1st`, `SS2_2nd`, `SS2_3rd` (SS2 term scores)
- `SS3_1st`, `SS3_2nd`, `SS3_3rd` (SS3 term scores)

Example row:
```
Full Name: John Doe
Student_ID: 001
Subject: Mathematics
SS1_1st: 85, SS1_2nd: 88, SS1_3rd: 90
SS2_1st: 87, SS2_2nd: 89, SS2_3rd: 92
SS3_1st: 88, SS3_2nd: 90, SS3_3rd: 93
```

### 2. Upload and Analyze
1. Login to the dashboard
2. Upload your Excel file
3. Click "Analyze"
4. Verify the analysis shows:
   - AI-Powered indicator badge (blue/purple gradient)
   - Individual student insights with course recommendations
   - University names, JAMB cutoffs, WAEC requirements

### 3. Download PDF Report
Click "Download PDF" to get a comprehensive report with:
- Overall class assessment
- Key insights and recommendations
- Individual student course recommendations with full details

## Features

### AI-Powered Analysis (Gemini 2.5-flash)
When properly configured, the system provides:
- ✅ Intelligent student performance analysis
- ✅ Personalized university course recommendations
- ✅ Realistic JAMB cutoff predictions
- ✅ WAEC subject requirements
- ✅ Context-aware insights based on SS1-SS3 performance
- ✅ Nigerian university system alignment

### Rule-Based Fallback (Without API Key)
If GEMINI_API_KEY is not configured:
- ⚠️ System uses rule-based analysis
- ⚠️ Less personalized recommendations
- ⚠️ Generic course matching based on subject scores
- ⚠️ Yellow warning badge shown in UI
- ⚠️ NOT recommended for production use

## API Endpoints

### Analysis Endpoint
```bash
POST /api/analysis/analyze
Content-Type: multipart/form-data
Body: file (Excel/CSV)

Response:
{
  "success": true,
  "aiPowered": true,  // false if using fallback
  "analysisType": "AI-Powered (Gemini 2.5)" | "Rule-Based (Fallback)",
  "totalStudents": 10,
  "totalSubjects": 8,
  "analysisResults": {
    "overallAssessment": { ... },
    "individualInsights": [
      {
        "studentName": "John Doe",
        "averageScore": "85.9",
        "strengths": ["Mathematics", "Physics"],
        "insight": "Exceptional performance...",
        "courseRecommendations": [
          {
            "course": "Computer Engineering",
            "university": "UNILAG, OAU, FUTA",
            "reason": "Excellent Math + Physics foundation",
            "jamb_cutoff": "260+",
            "waec_required": "Math, Physics, Chemistry, English"
          }
        ]
      }
    ]
  }
}
```

### PDF Download
```bash
GET /api/analysis/download-pdf/:sessionId
Response: PDF file (application/pdf)
```

### Health Check
```bash
GET /api/health
Response: { status: "OK", gemini_key: true/false }
```

## Troubleshooting

### Issue: "AI analysis is DISABLED" in console
**Solution:** Add GEMINI_API_KEY to backend/.env file

### Issue: PDF generation fails
**Solution:** 
- Check that pdfkit dependency is installed: `npm install pdfkit`
- Verify analysisResults structure includes courseRecommendations

### Issue: Empty or generic recommendations
**Solution:** 
- Ensure GEMINI_API_KEY is valid and active
- Check internet connectivity to Google AI servers
- Verify Excel file has proper column names and data

### Issue: "Analysis failed" error
**Solution:**
- Check Excel file format (must be .xlsx, .xls, or .csv)
- Ensure file has required columns (Full Name/Student_ID, Subject, term scores)
- Check file size (max 10MB)

## Security Considerations

### Production Deployment Checklist
- [ ] Change JWT_SECRET to a strong random string
- [ ] Enable HTTPS/SSL (use reverse proxy like nginx)
- [ ] Configure CORS allowed origins in server.js
- [ ] Set up rate limiting for API endpoints
- [ ] Use environment variables for all secrets
- [ ] Enable helmet.js security headers
- [ ] Set up logging and monitoring
- [ ] Configure backup strategy for analysis sessions
- [ ] Use secure file upload validation
- [ ] Implement user authentication (replace mock auth)

## Performance Optimization

### For High Traffic
1. **Enable caching:** Analysis results are cached by session ID
2. **Use connection pooling:** If adding database
3. **Set up load balancing:** For multiple server instances
4. **Configure CDN:** For frontend static files
5. **Optimize PDF generation:** Consider queuing for large reports

### For Large Files
- Increase multer file size limit in server.js
- Add file preprocessing for very large datasets
- Implement chunked analysis for 100+ students

## Monitoring

### Key Metrics to Track
- AI API call success rate
- Average analysis time
- PDF generation time
- Failed uploads
- API key usage limits

### Logs to Monitor
- `✅ Gemini AI initialized successfully` - Good
- `❌ AI analysis error` - Investigate API key or network
- `📊 Using rule-based analysis` - Warning, should use AI

## Support

For issues or questions:
1. Check console logs in both browser and server
2. Verify .env configuration
3. Test with sample data first
4. Review API response structure
5. Check Gemini API status at Google AI Studio

## Version Information
- Backend: Node.js with Express
- AI Model: Gemini 2.5-flash
- Frontend: Vanilla JavaScript + Tailwind CSS
- PDF: PDFKit

---

**Last Updated:** November 2025
**Version:** 2.0.0 (Production-Ready)
