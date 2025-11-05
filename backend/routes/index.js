const express = require('express');
const router = express.Router();
const multer = require('multer');
const { auth } = require('../middleware/auth');
const { analyzeFile, getAIAnalysis } = require('./analysis');

const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

router.post('/analyze', auth, upload.single('file'), analyzeFile);
router.post('/ai', auth, getAIAnalysis);

module.exports = router;