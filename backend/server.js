const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const analysisRoutes = require('./routes/analysis');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'https://yourdomain.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// File upload config
const multer = require('multer');
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.xlsx', '.xls', '.csv'].includes(path.extname(file.originalname).toLowerCase());
        cb(null, allowed);
    }
});

// Import middleware
const { auth } = require('./middleware/auth');

// === GEMINI AI SETUP ===
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        gemini_key: !!process.env.GEMINI_API_KEY,
        version: '2.0.0'
    });
});

// List available models
app.get('/list-models', async (req, res) => {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        res.json({
            success: true,
            count: data.models?.length || 0,
            models: data.models?.map(m => ({
                name: m.name.replace('models/', ''),
                displayName: m.displayName,
                supportsGenerateContent: m.supportedGenerationMethods.includes('generateContent')
            })) || []
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            hint: 'Check GEMINI_API_KEY in .env'
        });
    }
});

// TEST GEMINI (FIXED - WORKS NOW)
app.get('/test-gemini', async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(400).json({ success: false, error: 'GEMINI_API_KEY not set' });
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash', // Confirmed available
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 512
            }
        });

        const prompt = `You are EDU_AID. Respond with valid JSON only:
{
  "message": "Hello! I'm EDU_AID powered by Gemini 2.5 Flash.",
  "status": "online",
  "model": "gemini-2.5-flash"
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean code blocks
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        let jsonResponse;
        try {
            jsonResponse = JSON.parse(text);
        } catch {
            jsonResponse = { raw: text };
        }

        res.json({
            success: true,
            message: 'Gemini 2.5 Flash is working!',
            model: 'gemini-2.5-flash',
            response: jsonResponse
        });

    } catch (error) {
        console.error('Gemini Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            hint: 'Use gemini-2.5-flash and remove responseMimeType from generationConfig'
        });
    }
});

// ANALYZE EXCEL FILE (Main Feature)
app.post('/api/analyze-excel', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    try {
        const XLSX = require('xlsx');
        const workbook = XLSX.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        // Group and average scores by student
        const students = {};

        rows.forEach(row => {
            const id = row.Student_ID || row.student_id || row.ID || row.id;
            if (!id) return;

            if (!students[id]) students[id] = { subjects: {} };

            const subject = row.Subject || row.subject;
            const scores = [
                parseFloat(row.SS1_Score || row.ss1 || row.SS1),
                parseFloat(row.SS2_Score || row.ss2 || row.SS2),
                parseFloat(row.SS3_Score || row.ss3 || row.SS3)
            ].filter(n => !isNaN(n) && n > 0);

            if (subject && scores.length > 0) {
                const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
                students[id].subjects[subject] = avg;
            }
        });

        // Build prompt text
        let dataText = '';
        for (const [id, data] of Object.entries(students)) {
            dataText += `Student ID: ${id}\n`;
            for (const [sub, avg] of Object.entries(data.subjects)) {
                dataText += `  • ${sub}: ${avg}/100\n`;
            }
            dataText += '\n';
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 4096
            }
        });

        const prompt = `
You are EDU_AID, an expert Nigerian university course advisor.

Analyze SS1-SS3 results and for EACH student:
- List top 3 strengths (subjects >70 avg)
- Give 1 key insight
- Recommend 3 university courses with:
  • reason
  • JAMB cutoff (approx)
  • required WAEC subjects

Data:
${dataText}

Return valid JSON array only:
[
  {
    "student_id": "001",
    "strengths": ["Mathematics", "Physics"],
    "insight": "Consistent improvement in sciences",
    "recommendations": [
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
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean JSON
        text = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();

        // Delete uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            analyzed_students: Object.keys(students).length,
            analysis: JSON.parse(text)
        });

    } catch (error) {
        console.error('Analysis error:', error);
        if (req.file?.path) fs.unlinkSync(req.file.path);
        res.status(500).json({
            success: false,
            error: error.message,
            hint: 'Check Excel format and column names'
        });
    }
});

// 404 & Error Handler
app.use('*', (req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`EDU_AID Server Running on http://localhost:${PORT}`);
    console.log(`Gemini Model: gemini-2.5-flash`);
    console.log(`API Key: ${process.env.GEMINI_API_KEY ? 'Loaded' : 'MISSING'}`);
});

module.exports = app;