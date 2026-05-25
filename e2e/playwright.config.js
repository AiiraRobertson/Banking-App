// @ts-check
const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config();

// Kapita app URLs
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:3001';
const E2E_BYPASS_TOKEN = process.env.E2E_BYPASS_TOKEN || '';

// Determine if we're running against local dev or production
const isProduction = BASE_URL.includes('https://') || BASE_URL.includes('netlify') || BASE_URL.includes('render');
const isLocalhost = BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1');

console.log(`🎭 Playwright E2E Configuration`);
console.log(`   BASE_URL: ${BASE_URL}`);
console.log(`   API_URL: ${API_URL}`);
console.log(`   Environment: ${isProduction ? '🌐 PRODUCTION' : '🏠 LOCAL DEV'}`);

// Define timeouts based on environment (production may be slower)
const timeouts = isProduction
  ? { test: 120 * 1000, expect: 15 * 1000, navigation: 60 * 1000, action: 30 * 1000 }
  : { test: 60 * 1000, expect: 10 * 1000, navigation: 30 * 1000, action: 15 * 1000 };

// Web servers only needed for local development
const webServer = isLocalhost
  ? [
      {
        command: 'npm run dev --prefix ../client',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
      {
        command: 'npm run dev --prefix ../server',
        url: `${API_URL}/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
    ]
  : [];

const config = defineConfig({
  testDir: './tests',
  timeout: timeouts.test,
  expect: { timeout: timeouts.expect },
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
    actionTimeout: timeouts.action,
    navigationTimeout: timeouts.navigation,
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
  ...(webServer.length > 0 && { webServer }),
});

module.exports = config;

// Export for use in other files
module.exports.BASE_URL = BASE_URL;
module.exports.API_URL = API_URL;
module.exports.E2E_BYPASS_TOKEN = E2E_BYPASS_TOKEN;

module.exports.BASE_URL = BASE_URL;
module.exports.API_URL = API_URL;
module.exports.E2E_BYPASS_TOKEN = E2E_BYPASS_TOKEN;
