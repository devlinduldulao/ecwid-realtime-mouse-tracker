const { test, expect } = require('@playwright/test');

async function expectMinimumContrast(page, selector, minimumRatio) {
  const ratio = await page.locator(selector).first().evaluate((element) => {
    function parse(color) {
      const match = color.match(/rgba?\(([^)]+)\)/i);

      if (!match) {
        return null;
      }

      const values = match[1].split(',').map((value) => Number.parseFloat(value.trim()));

      return {
        r: values[0],
        g: values[1],
        b: values[2],
        a: values.length > 3 ? values[3] : 1,
      };
    }

    function relativeLuminance(channel) {
      const normalized = channel / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    }

    function contrastRatio(foreground, background) {
      const foregroundLuminance = 0.2126 * relativeLuminance(foreground.r)
        + 0.7152 * relativeLuminance(foreground.g)
        + 0.0722 * relativeLuminance(foreground.b);
      const backgroundLuminance = 0.2126 * relativeLuminance(background.r)
        + 0.7152 * relativeLuminance(background.g)
        + 0.0722 * relativeLuminance(background.b);
      const lighter = Math.max(foregroundLuminance, backgroundLuminance);
      const darker = Math.min(foregroundLuminance, backgroundLuminance);

      return (lighter + 0.05) / (darker + 0.05);
    }

    function findBackgroundColor(node) {
      let current = node;

      while (current) {
        const parsed = parse(window.getComputedStyle(current).backgroundColor);

        if (parsed && parsed.a > 0) {
          return parsed;
        }

        current = current.parentElement;
      }

      return { r: 255, g: 255, b: 255, a: 1 };
    }

    const foreground = parse(window.getComputedStyle(element).color);
    const background = findBackgroundColor(element);

    return contrastRatio(foreground, background);
  });

  expect(ratio).toBeGreaterThanOrEqual(minimumRatio);
}

async function mockEcwidStorefront(page) {
  await page.route('https://app.ecwid.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: [
        'window.xProductBrowser = function () {};',
        'window.Ecwid = {',
        '  OnAPILoaded: { add: function (callback) { callback(); } },',
        '  OnPageLoaded: { add: function () {} },',
        '  OnCartChanged: { add: function () {} },',
        '  OnOrderPlaced: { add: function () {} }',
        '};',
      ].join('\n'),
    });
  });
}

async function saveAdminSettings(page, values) {
  if (values.channelKey !== undefined) {
    await page.locator('#channel-key').fill(values.channelKey);
  }

  if (values.enabled === false) {
    await page.locator('#tracker-enabled').uncheck();
  }

  if (values.enabled === true) {
    await page.locator('#tracker-enabled').check();
  }

  await page.getByRole('button', { name: 'Save Local Settings' }).click();
  await expect(page.getByText('Saved locally for this merchant browser session.')).toBeVisible();
}

test.describe('admin dashboard', () => {
  test('exposes an accessible label for the install snippet field', async ({ page }) => {
    await page.goto('/public/index.html');

    const snippetField = page.getByLabel('Generated install snippet');

    await expect(snippetField).toBeVisible();
    await expect(snippetField).toHaveAttribute('aria-describedby', 'install-snippet-help');
  });

  test('keeps hero text and dashboard badge above minimum contrast', async ({ page }) => {
    await page.goto('/public/index.html');

    await expectMinimumContrast(page, '.kicker', 4.5);
    await expectMinimumContrast(page, '.hero p', 4.5);
  });

  test('loads from the site root without redirecting to public/index.html', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/');

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Realtime Mouse Tracker' })).toBeVisible();
    await expect(page.locator('#install-snippet')).toHaveValue(/http:\/\/127\.0\.0\.1:\d+\/src\/shared\/browser-state\.js/);

    expect(pageErrors).toEqual([]);
  });

  test('loads in standalone mode without Ecwid payload and shows empty live state', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/public/index.html');

    await expect(page.getByRole('heading', { name: 'Realtime Mouse Tracker' })).toBeVisible();
    await expect(page.getByText('Standalone preview · store demo-store')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try Preview (Sample Data)' })).toBeVisible();
    await expect(page.locator('[data-rmt-metric="active_visitors"]')).toHaveText('0');
    await expect(page.getByText('No visitors yet')).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test('toggles preview mode and renders fake dashboard data', async ({ page }) => {
    await page.goto('/public/index.html');

    await page.getByRole('button', { name: 'Try Preview (Sample Data)' }).click();

    await expect(page.getByRole('button', { name: 'Return to Live Data' })).toBeVisible();
    await expect(page.getByText('Preview mode — Sample data')).toBeVisible();
    await expect(page.locator('[data-rmt-metric="active_visitors"]')).toHaveText('5');
    await expect(page.locator('[data-rmt-metric="rage_clicks"]')).toHaveText('3');
    await expect(page.getByText('Bamboo Desk Lamp')).toBeVisible();
    await expect(page.locator('[data-rmt-events] strong').filter({ hasText: 'rage click' }).first()).toBeVisible();
  });

  test('switches preview scenarios and updates fake data', async ({ page }) => {
    await page.goto('/public/index.html');
    await page.getByRole('button', { name: 'Try Preview (Sample Data)' }).click();
    await page.locator('#preview-scenario').selectOption('checkout_hesitation');

    await expect(page.getByText('Showing "Checkout hesitation" scenario')).toBeVisible();
    await expect(page.locator('[data-rmt-metric="dead_clicks"]')).toHaveText('4');
    await expect(page.locator('[data-rmt-metric="active_visitors"]')).toHaveText('3');
    await expect(page.locator('[data-rmt-visitors]').getByText('Checkout', { exact: true })).toBeVisible();
  });

  test('saves merchant settings locally and keeps them after reload', async ({ page }) => {
    await page.goto('/public/index.html');

    await page.locator('#channel-key').fill('merchant-demo-channel');
    await page.locator('#poll-interval').fill('3500');
    await page.locator('#retention-seconds').fill('180');
    await page.locator('#max-visitors').fill('9');
    await page.getByRole('button', { name: 'Save Local Settings' }).click();

    await expect(page.getByText('Saved locally for this merchant browser session.')).toBeVisible();
    await expect(page.locator('#install-snippet')).toHaveValue(/merchant-demo-channel/);

    await page.reload();

    await expect(page.locator('#channel-key')).toHaveValue('merchant-demo-channel');
    await expect(page.locator('#poll-interval')).toHaveValue('3500');
    await expect(page.locator('#retention-seconds')).toHaveValue('180');
    await expect(page.locator('#max-visitors')).toHaveValue('9');
  });

  test('renders seeded live local state and clears it on reset', async ({ page }) => {
    await page.goto('/public/index.html');
    await page.evaluate(() => {
      localStorage.setItem('rmt-ecwid-settings:demo-store', JSON.stringify({
        enabled: true,
        channelKey: 'demo-store',
        pollIntervalMs: 2000,
        retentionSeconds: 120,
        maxActiveVisitors: 12,
        sampleRate: 100,
      }));

      localStorage.setItem('rmt-ecwid-state:demo-store', JSON.stringify({
        visitors: {
          'visitor-1': {
            visitor_id: 'visitor-1',
            first_seen: 100,
            last_seen: Math.floor(Date.now() / 1000),
            status: 'active',
            page: { title: 'Seeded Product', path: '/p/seeded-product', type: 'PRODUCT' },
            cursor: { x: 44, y: 38 },
            scroll_y: 61,
            event_count: 3,
            rage_clicks: 1,
            dead_clicks: 0,
            last_event_type: 'rage_click',
          },
        },
        events: [
          {
            visitor_id: 'visitor-1',
            page: { title: 'Seeded Product', path: '/p/seeded-product', type: 'PRODUCT' },
            type: 'rage_click',
            x: 44,
            y: 38,
            scroll_y: 61,
            timestamp: Math.floor(Date.now() / 1000),
          },
        ],
        updated_at: Math.floor(Date.now() / 1000),
      }));
    });

    await page.reload();

    await expect(page.locator('[data-rmt-metric="active_visitors"]')).toHaveText('1');
    await expect(page.getByText('Seeded Product')).toBeVisible();

    await page.getByRole('button', { name: 'Clear Session Data' }).click();

    await expect(page.getByText('Cleared browser-local session data for channel demo-store.')).toBeVisible();
    await expect(page.locator('[data-rmt-metric="active_visitors"]')).toHaveText('0');
    await expect(page.getByText('No visitors yet')).toBeVisible();
  });

  test('ingests real storefront activity into the live dashboard without using preview mode', async ({ browser }) => {
    const context = await browser.newContext();
    const adminPage = await context.newPage();
    const storefrontPage = await context.newPage();

    await mockEcwidStorefront(storefrontPage);

    await adminPage.goto('/public/index.html');
    await saveAdminSettings(adminPage, { channelKey: 'ecwid-demo-store', enabled: true });
    await expect(adminPage.getByRole('button', { name: 'Try Preview (Sample Data)' })).toBeVisible();
    await expect(adminPage.locator('[data-rmt-mode-label]')).toHaveText('Live self-test mode');

    await storefrontPage.goto('/public/storefront-test.html');
    await storefrontPage.mouse.move(220, 280);
    await storefrontPage.mouse.click(240, 300);
    await storefrontPage.mouse.click(240, 300);
    await storefrontPage.mouse.click(240, 300);
    await storefrontPage.evaluate(() => {
      window.RMTEcwidTracker.flush();
    });

    await adminPage.getByRole('button', { name: 'Refresh' }).click();

    await expect(adminPage.locator('[data-rmt-metric="active_visitors"]')).toHaveText('1');
    await expect(adminPage.locator('[data-rmt-metric="events_per_minute"]')).not.toHaveText('0');
    await expect(adminPage.locator('[data-rmt-metric="rage_clicks"]')).toHaveText('1');
    await expect(adminPage.locator('[data-rmt-metric="dead_clicks"]')).toHaveText('3');
    await expect(adminPage.getByText('Ecwid Storefront Self-Test')).toBeVisible();
    await expect(adminPage.locator('[data-rmt-events] strong').filter({ hasText: 'rage click' }).first()).toBeVisible();

    await context.close();
  });

  test('keeps live dashboard empty when storefront traffic uses a different channel', async ({ browser }) => {
    const context = await browser.newContext();
    const adminPage = await context.newPage();
    const storefrontPage = await context.newPage();

    await mockEcwidStorefront(storefrontPage);

    await adminPage.goto('/public/index.html');
    await saveAdminSettings(adminPage, { channelKey: 'merchant-live-channel', enabled: true });

    await storefrontPage.goto('/public/storefront-test.html');
    await storefrontPage.mouse.click(240, 300);
    await storefrontPage.evaluate(() => {
      window.RMTEcwidTracker.flush();
    });

    await adminPage.getByRole('button', { name: 'Refresh' }).click();

    await expect(adminPage.locator('[data-rmt-metric="active_visitors"]')).toHaveText('0');
    await expect(adminPage.getByText('No visitors yet')).toBeVisible();

    await context.close();
  });

  test('drops real storefront events when the merchant disables tracking for the live channel', async ({ browser }) => {
    const context = await browser.newContext();
    const adminPage = await context.newPage();
    const storefrontPage = await context.newPage();

    await mockEcwidStorefront(storefrontPage);

    await adminPage.goto('/public/index.html');
    await saveAdminSettings(adminPage, { channelKey: 'ecwid-demo-store', enabled: false });

    await storefrontPage.goto('/public/storefront-test.html');
    await storefrontPage.mouse.click(240, 300);
    await storefrontPage.evaluate(() => {
      window.RMTEcwidTracker.flush();
    });

    await adminPage.getByRole('button', { name: 'Refresh' }).click();

    await expect(adminPage.locator('[data-rmt-metric="active_visitors"]')).toHaveText('0');
    await expect(adminPage.locator('[data-rmt-metric="events_per_minute"]')).toHaveText('0');
    await expect(adminPage.getByText('No visitors yet')).toBeVisible();

    await context.close();
  });
});