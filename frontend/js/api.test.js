// frontend/js/api.test.js
import { analyzeResults, sendChatMessage } from './api';

test('analyzeResults makes correct API call', async () => {
  const mockData = {
    results: {
      scores: [85, 90, 75],
      subjects: ['Math', 'Science', 'English']
    }
  };
  
  const response = await analyzeResults(mockData);
  expect(response).toHaveProperty('analysis');
  expect(response).toHaveProperty('insights');
});