# EDU_AID - Educational AI Assistant

An intelligent educational platform powered by Google's Gemini AI that analyzes student data, provides detailed insights, and offers personalized recommendations for improved learning outcomes.

## Features

- 🔒 Secure JWT-based authentication system
- 📊 Excel/CSV file upload and advanced data analysis
- 🧠 **Gemini AI 2.5-powered educational insights** (REQUIRES API KEY)
- 🎓 Personalized Nigerian university course recommendations
- 📈 Performance tracking with AI-based analysis
- 🎯 Smart, data-driven recommendations with JAMB/WAEC info
- 💬 Interactive AI chat interface with context awareness
- 📋 Comprehensive student performance metrics
- 🔄 Real-time data processing and visualization
- 📱 Responsive design for all devices
- 📄 Professional PDF report generation
- 🔍 SS1-SS3 academic performance pattern recognition

## Architecture

### Frontend
- HTML5, TailwindCSS for styling
- Vanilla JavaScript for interactivity
- Lucide icons for UI elements
- Responsive design for all devices

### Backend
- Python Flask REST API
- Scikit-learn for AI analysis
- Pandas for data processing
- JWT authentication
- File upload handling

## Setup Instructions

### Backend Setup

1. Install system dependencies:
```bash
sudo apt install python3-venv python3-pip
```

2. Set up virtual environment and install requirements:
```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
python -m pip install --upgrade pip setuptools wheel
pip install -r backend/requirements.txt
```

3. Set up environment variables:
```bash
# Create .env file
cp backend/.env.example backend/.env

# Edit backend/.env and add your Gemini AI API key
# Get your key from: https://makersuite.google.com/app/apikey
# GEMINI_API_KEY=your_actual_api_key_here
```

**⚠️ IMPORTANT:** GEMINI_API_KEY is REQUIRED for production use. Without it, the system will use a basic rule-based fallback (NOT recommended).

4. Run the Flask server:
```bash
cd backend
python app.py
```
The server will start at `https://edu-aid.onrender.com`

### Frontend Setup

1. Open the frontend in VS Code
2. Install Live Server extension
3. Right-click on `frontend/login.html` and select "Open with Live Server"

The application will open in your default browser.

## API Endpoints

### Authentication
- POST `/api/login` - Login endpoint
  - Body: `{ "email": "user@example.com", "password": "password" }`
  - Returns: `{ "token": "jwt_token", "user_id": "user_id" }`

### File Analysis
- POST `/api/analyze` - Analyze uploaded Excel/CSV file
  - Headers: `Authorization: Bearer <token>`
  - Body: FormData with file
  - Returns: Analysis results including stats, clusters, and recommendations

### AI Analysis
- POST `/api/analyze/ai` - Get Gemini AI analysis
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "data": { student_data } }`
  - Returns: `{ "analysis": "", "insights": [], "recommendations": [] }`

### Chat
- POST `/api/chat` - Interact with AI assistant
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "message": "your question", "context": { data } }`
  - Returns: `{ "response": "", "insights": "" }`

## File Structure

```
edu-aid/
├── frontend/
│   ├── css/
│   │   ├── main.css
│   │   └── tailwind.css
│   ├── js/
│   │   ├── api.js
│   │   ├── auth.js
│   │   └── chat.js
│   ├── login.html
│   └── dashboard.html
├── backend/
│   ├── services/
│   │   ├── analyzer.py
│   │   ├── ai_analyzer.py
│   │   └── ai_assistant.py
│   ├── middleware/
│   │   └── auth.py
│   ├── routes/
│   │   ├── auth.py
│   │   ├── analysis.py
│   │   └── chat.py
│   ├── tests/
│   │   └── test_endpoints.py
│   ├── requirements.txt
│   └── app.py
└── README.md
```

## Testing

Run backend tests:
```bash
cd backend
pytest tests/
```

## Development Guidelines

1. Use the mock authentication for development
2. Test with sample Excel files containing:
   - Student grades
   - Attendance (optional)
   - Participation scores (optional)
3. Use .env.example as a template for your .env file
4. Follow REST API best practices
5. Write tests for new endpoints
6. Document API changes

## Production Deployment

For production deployment, see [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive guide.

**Critical Requirements:**
1. ✅ Configure GEMINI_API_KEY (required for AI analysis)
2. ✅ Set secure JWT_SECRET
3. ✅ Enable HTTPS/SSL encryption
4. ✅ Configure proper CORS origins
5. ✅ Set up rate limiting
6. ✅ Enable error logging and monitoring
7. ✅ Implement data backup strategy
8. ✅ Replace mock authentication with real user management
9. ✅ Configure security headers (helmet.js)
10. ✅ Test with actual student data

**System Status Indicators:**
- 🟢 **AI-Powered**: Gemini API key configured, full AI analysis enabled
- 🟡 **Rule-Based**: No API key, using fallback logic (not recommended for production)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - feel free to use this project for educational purposes.