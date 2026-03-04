import { test as setup, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const authFile = 'playwright/.auth/user.json';

// JWT token for authentication
const AUTH_TOKEN = process.env.DASHBOARD_TEST_TOKEN || '';

// Mock user data that matches the JWT token
const MOCK_USER = {
  id: '1',
  discordId: '566577469172351007',
  username: 'TestUser',
  discriminator: '0000',
  avatar: null,
  role: 'owner',
  isPremium: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

setup('authenticate', async ({ page, context }) => {
  // Route interception to mock API responses
  await context.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        user: MOCK_USER,
        csrfToken: 'mock-csrf-token',
      }),
    });
  });

  // Navigate to the base URL first to set up the domain
  await page.goto('/');

  // Set the JWT token in localStorage for authentication
  await page.evaluate((token) => {
    localStorage.setItem('dashboard_token', token);
    // Also set in cookies as a backup method
    document.cookie = `dashboard_token=${token}; path=/; max-age=604800`;
  }, AUTH_TOKEN);

  // Verify the token was set correctly
  const storedToken = await page.evaluate(() => {
    return localStorage.getItem('dashboard_token');
  });
  
  expect(storedToken).toBe(AUTH_TOKEN);

  // Navigate to dashboard to verify authentication works
  await page.goto('/dashboard');
  
  // Wait for page to stabilize
  await page.waitForTimeout(2000);

  // Save authentication state (includes localStorage and cookies)
  await page.context().storageState({ path: authFile });
  
  console.log('✓ Authentication state saved successfully');
});
