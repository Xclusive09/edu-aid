const request = require('supertest');
const app = require('../server');
const path = require('path');

describe('EDU-AID Backend API', () => {
  let authToken;

  // Test authentication
  describe('Authentication', () => {
    test('POST /api/auth/login - should login successfully with valid credentials', async () => {
      const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'admin@edu-aid.com',
            password: 'admin123'
          });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('admin@edu-aid.com');

      authToken = response.body.token;
    });

    test('POST /api/auth/login - should fail with invalid credentials', async () => {
      const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'invalid@example.com',
            password: 'wrongpassword'
          });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('GET /api/auth/verify - should verify valid token', async () => {
      const response = await request(app)
          .get('/api/auth/verify')
          .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
    });

    test('GET /api/auth/verify - should reject invalid token', async () => {
      const response = await request(app)
          .get('/api/auth/verify')
          .set('Authorization', 'Bearer invalidtoken');

      expect(response.status).toBe(401);
    });
  });

  // Test file analysis
  describe('File Analysis', () => {
    test('POST /api/analysis/analyze - should require authentication', async () => {
      const response = await request(app)
          .post('/api/analysis/analyze');

      expect(response.status).toBe(401);
    });

    test('POST /api/analysis/analyze - should require file upload', async () => {
      const response = await request(app)
          .post('/api/analysis/analyze')
          .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No file uploaded');
    });

    // Note: Add test files in backend/tests/fixtures/
    test('POST /api/analysis/analyze - should analyze valid Excel file', async () => {
      const testFilePath = path.join(__dirname, 'fixtures', 'test-data.xlsx');

      const response = await request(app)
          .post('/api/analysis/analyze')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', testFilePath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
    });
  });

  // Test AI analysis
  describe('AI Analysis', () => {
    test('POST /api/analysis/ai-analyze - should require data', async () => {
      const response = await request(app)
          .post('/api/analysis/ai-analyze')
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

      expect(response.status).toBe(400);
    });

    test('POST /api/analysis/ai-analyze - should analyze with valid data', async () => {
      const mockData = {
        students: [
          { name: 'John Doe', grade: 85, attendance: 90 },
          { name: 'Jane Smith', grade: 92, attendance: 95 }
        ]
      };

      const response = await request(app)
          .post('/api/analysis/ai-analyze')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ data: mockData });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Test chat functionality
  describe('Chat', () => {
    test('POST /api/chat/message - should require message', async () => {
      const response = await request(app)
          .post('/api/chat/message')
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

      expect(response.status).toBe(400);
    });

    test('POST /api/chat/message - should respond to valid message', async () => {
      const response = await request(app)
          .post('/api/chat/message')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            message: 'Hello, can you help me analyze student performance?',
            context: {}
          });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('response');
    });
  });

  // Test health check
  describe('Health Check', () => {
    test('GET /api/health - should return server status', async () => {
      const response = await request(app)
          .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});