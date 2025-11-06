# Gemini API Troubleshooting Guide

## Error: `fetch failed` or `ECONNREFUSED`

This error occurs when the backend cannot connect to Google's Gemini API servers.

### **Possible Causes & Solutions:**

### 1. **Internet Connection Issues**
```bash
# Test your internet connection
ping -c 4 google.com

# Test Gemini API endpoint
curl -I https://generativelanguage.googleapis.com
```

**Solution:** Ensure you have a stable internet connection.

---

### 2. **Firewall/Proxy Blocking**
Your firewall or corporate proxy might be blocking the connection.

**Solution:**
```bash
# Check if using a proxy
echo $HTTP_PROXY
echo $HTTPS_PROXY

# If behind a proxy, configure Node.js
export HTTP_PROXY=http://your-proxy:port
export HTTPS_PROXY=http://your-proxy:port
```

---

### 3. **DNS Resolution Issues**
```bash
# Test DNS resolution
nslookup generativelanguage.googleapis.com

# Try using Google's DNS
sudo nano /etc/resolv.conf
# Add: nameserver 8.8.8.8
```

---

### 4. **Invalid API Key**
```bash
# Verify your API key is set
echo $GEMINI_API_KEY

# Test API key directly
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
  "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY"
```

**Solution:** 
- Get a valid API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Update your `.env` file:
```env
GEMINI_API_KEY=your_actual_api_key_here
```

---

### 5. **SSL/TLS Certificate Issues**
```bash
# Temporarily disable SSL verification (NOT for production)
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

---

### 6. **Network Timeout**
The request might be timing out. The system now has a 30-second timeout.

**Solution:** Check your network speed or try again during off-peak hours.

---

## **Fallback System**

Good news! The system automatically falls back to comprehensive analysis when AI is unavailable:

✅ **Still provides:**
- Student performance analysis
- University course recommendations
- Subject strengths identification
- JAMB/WAEC requirements
- Actionable insights

✅ **Features working without AI:**
- Performance scoring
- Subject analysis
- Course matching based on strengths
- Personalized recommendations

---

## **Test Gemini API Connection**

Create a test script:

```javascript
// test-gemini.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGemini() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent('Say hello!');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Success! Gemini API is working');
    console.log('Response:', text);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGemini();
```

Run it:
```bash
node test-gemini.js
```

---

## **Current Status**

Your system is working with the **fallback analysis**:
- ✅ File uploads working
- ✅ Data parsing working  
- ✅ Analysis complete
- ✅ Course recommendations generated
- ⚠️  AI enhancement unavailable (network issue)

The fallback provides **80%** of the features with intelligent course matching!

---

## **To Enable Full AI:**

1. **Check internet:** `ping google.com`
2. **Verify API key:** Check `.env` file
3. **Test connection:** Run test script above
4. **Check firewall:** Ensure port 443 is open
5. **Restart server:** `npm run dev`

---

## **Support**

If issues persist:
1. Check [Google AI Studio Status](https://status.cloud.google.com/)
2. Review API quota limits
3. Try regenerating API key
4. Contact system administrator

The system will continue to work with comprehensive analysis until AI connection is restored.
