const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');

const projectRoot = path.resolve(__dirname, '..');
const screenshotRoot = path.join(projectRoot, 'assets', 'marketplace', 'screenshots');
const baseUrl = process.env.RMT_CAPTURE_BASE_URL || 'http://127.0.0.1:4273';

function createSeedState() {
  const now = Math.floor(Date.now() / 1000);

  return {
    settings: {
      enabled: true,
      channelKey: 'demo-store',
      pollIntervalMs: 2000,
      retentionSeconds: 120,
      maxActiveVisitors: 12,
      sampleRate: 100,
    },
    state: {
      visitors: {
        'visitor-1': {
          visitor_id: 'visitor-1',
          first_seen: now - 54,
          last_seen: now,
          status: 'active',
          page: { title: 'Bamboo Desk Lamp', path: '/p/bamboo-desk-lamp', type: 'PRODUCT' },
          cursor: { x: 68, y: 34 },
          scroll_y: 57,
          event_count: 14,
          rage_clicks: 2,
          dead_clicks: 0,
          last_event_type: 'rage_click',
        },
        'visitor-2': {
          visitor_id: 'visitor-2',
          first_seen: now - 41,
          last_seen: now - 2,
          status: 'active',
          page: { title: 'Ceramic Pour Over Set', path: '/p/ceramic-pour-over-set', type: 'PRODUCT' },
          cursor: { x: 78, y: 46 },
          scroll_y: 62,
          event_count: 11,
          rage_clicks: 0,
          dead_clicks: 1,
          last_event_type: 'click',
        },
      },
      events: [
        {
          visitor_id: 'visitor-1',
          page: { title: 'Bamboo Desk Lamp', path: '/p/bamboo-desk-lamp', type: 'PRODUCT' },
          type: 'rage_click',
          x: 71,
          y: 39,
          scroll_y: 57,
          timestamp: now - 9,
        },
        {
          visitor_id: 'visitor-2',
          page: { title: 'Ceramic Pour Over Set', path: '/p/ceramic-pour-over-set', type: 'PRODUCT' },
          type: 'click',
          x: 79,
          y: 51,
          scroll_y: 62,
          timestamp: now - 22,
        },
      ],
      updated_at: now,
    },
  };
}

async function captureLive(page) {
  const seed = createSeedState();

  await page.goto(baseUrl + '/public/index.html', { waitUntil: 'networkidle' });
  await page.evaluate((payload) => {
    localStorage.setItem('rmt-ecwid-settings:demo-store', JSON.stringify(payload.settings));
    localStorage.setItem('rmt-ecwid-state:demo-store', JSON.stringify(payload.state));
    localStorage.removeItem('rmt-ecwid-preview-mode');
    localStorage.removeItem('rmt-ecwid-preview-scenario');
  }, seed);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('[data-rmt-metric="active_visitors"]').waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(screenshotRoot, 'dashboard-live.png'), fullPage: true });
}

async function capturePreview(page) {
  await page.goto(baseUrl + '/public/index.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.removeItem('rmt-ecwid-settings:demo-store');
    localStorage.removeItem('rmt-ecwid-state:demo-store');
    localStorage.removeItem('rmt-ecwid-preview-mode');
    localStorage.removeItem('rmt-ecwid-preview-scenario');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Enable Preview' }).click();
  await page.locator('[data-rmt-metric="active_visitors"]').waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(screenshotRoot, 'dashboard-preview.png'), fullPage: true });
}

async function captureSetup(page) {
  await page.goto(baseUrl + '/public/index.html', { waitUntil: 'networkidle' });
  await page.locator('#channel-key').fill('ecwid-marketplace-demo');
  await page.locator('#poll-interval').fill('3500');
  await page.locator('#retention-seconds').fill('180');
  await page.locator('#max-visitors').fill('9');
  await page.getByRole('button', { name: 'Save Local Settings' }).click();
  await page.locator('#install-snippet').waitFor({ state: 'visible' });
  await page.locator('article.panel.span-12').screenshot({
    path: path.join(screenshotRoot, 'setup-snippet.png'),
  });
}

async function main() {
  fs.mkdirSync(screenshotRoot, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1600 }, deviceScaleFactor: 2 });
  const page = await context.newPage();

  try {
    await captureLive(page);
    await capturePreview(page);
    await captureSetup(page);
    console.log('Captured marketplace screenshots in assets/marketplace/screenshots');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});