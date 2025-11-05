# EDU_AID - Installation Guide

## Backend Setup

### 1. Install Node.js Dependencies

```bash
cd backend

# Install all required packages
npm install express cors helmet express-rate-limit morgan dotenv
npm install @google/generative-ai
npm install jsonwebtoken bcryptjs
npm install multer
npm install xlsx csv-parser fs-extra
npm install simple-statistics
npm install pdfkit

# Install dev dependencies (optional)
npm install --save-dev nodemon
```

### 2. Alternative: Use package.json

Create or update `backend/package.json`:

```json
{
  "name": "edu-aid-backend",
  "version": "1.0.0",
  "description": "Educational AI Assistant Backend",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "dependencies": {
    "@google/generative-ai": "^0.21.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "csv-parser": "^3.0.0",
    "dotenv": "^16.4.5",
    "express": "^4.21.2",
    "express-rate-limit": "^7.5.0",
    "fs-extra": "^11.2.0",
    "helmet": "^8.0.0",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.0",
    "multer": "^1.4.5-lts.1",
    "pdfkit": "^0.15.1",
    "simple-statistics": "^7.8.8",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "nodemon": "^3.1.9"
  }
}
```

Then run:
```bash
npm install
```

### 3. Environment Setup

Make sure your `.env` file has:

```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

JWT_SECRET=your-jwt-secret-key
GEMINI_API_KEY=your-gemini-api-key

MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads

RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

### 4. Create Required Directories

```bash
mkdir -p uploads
mkdir -p logs
```

### 5. Test Gemini AI Connection

```bash
# Start the server
node server.js

# In another terminal, test Gemini
curl http://localhost:5000/test-gemini
```

### 6. Run the Server

```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev
```

## Frontend Setup

### 1. No build required
The frontend uses vanilla JavaScript, just serve it with Live Server or any static server.

### 2. Update API Base URL
Make sure `frontend/js/api.js` points to your backend:
```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

## Troubleshooting

### Issue: Gemini API 404 Error
**Solution:** We're using `gemini-2.0-flash-exp` which is the latest experimental model. If you get a 404, try:
- `gemini-2.0-flash-exp` (recommended, latest)
- `gemini-1.5-pro` (stable alternative)
- `gemini-1.5-flash` (faster alternative)

### Issue: CORS Errors
**Solution:** The server is configured for `http://127.0.0.1:5500`. Update `server.js` if using different port.

### Issue: File Upload Fails
**Solution:** Ensure `uploads/` directory exists and has write permissions:
```bash
mkdir uploads
chmod 755 uploads
```

## API Models Available

Current model: **gemini-2.0-flash-exp**
- Latest experimental version
- Fast response time
- Improved reasoning
- Best for educational analysis

Alternative models:
- `gemini-1.5-pro` - More detailed analysis
- `gemini-1.5-flash` - Faster responses
- `gemini-1.5-flash-8b` - Lightweight version

## Package Versions

Minimum versions required:
- Node.js: >= 18.0.0
- npm: >= 9.0.0
- @google/generative-ai: >= 0.21.0

Check versions:
```bash
node --version
npm --version
npm list @google/generative-ai
```