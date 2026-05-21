// @ts-check
const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config();

// Kapita app URLs
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:3001';
const E2E_BYPASS_TOKEN = process.env.E2E_BYPASS_TOKEN || '';

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60 * 1000,
  expect: { timeout: 10 * 1000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.js/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      dependencies: ['setup'],
    },
  ],
  outputDir: 'test-results/',
  webServer: [
    {
      command: 'npm run dev --prefix ../client',
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: 'npm run start --prefix ../server',
      url: `${API_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});

module.exports.BASE_URL = BASE_URL;
module.exports.API_URL = API_URL;
module.exports.E2E_BYPASS_TOKEN = E2E_BYPASS_TOKEN;
