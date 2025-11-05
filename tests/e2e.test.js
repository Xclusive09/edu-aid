import { expect, test } from '@playwright/test';

test('complete user flow', async ({ page }) => {
    // Login
    await page.goto('http://localhost:5000/login');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.click('#login-button');
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Upload file
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/test_data.xlsx');
    
    // Wait for analysis
    await page.waitForSelector('#analysis-complete');
    
    // Verify AI insights are displayed
    const insights = await page.locator('#ai-insights');
    await expect(insights).toBeVisible();
    
    // Test chat interaction
    await page.fill('#chat-input', 'What are the key findings?');
    await page.click('#send-button');
    
    // Verify response
    const response = await page.locator('.ai-message').last();
    await expect(response).toBeVisible();
});