const { defineConfig } = require('@playwright/test');

const testPort = 4181;

module.exports = defineConfig({
  testDir: './tests/ui',
  timeout: 30000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:' + testPort,
    trace: 'on-first-retry',
    headless: true,
  },
  webServer: {
    command: 'npm run build && python3 -m http.server ' + testPort + ' -d dist',
    port: testPort,
    reuseExistingServer: false,
    timeout: 120000,
  },
});