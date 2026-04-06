const test = require('node:test');
const assert = require('node:assert/strict');

const stateApi = require('../src/shared/browser-state.js');

test('loadSettings returns defaults for a new store', () => {
  const storage = stateApi.createMemoryStorage();
  const settings = stateApi.loadSettings('Store 123', { storage });

  assert.deepEqual(settings, {
    enabled: true,
    channelKey: 'store-123',
    pollIntervalMs: 2000,
    retentionSeconds: 120,
    maxActiveVisitors: 12,
    sampleRate: 100,
  });
});

test('loadSettings falls back when stored JSON is invalid', () => {
  const storage = stateApi.createMemoryStorage();
  storage.setItem('rmt-ecwid-settings:bad-store', '{not-json');

  const settings = stateApi.loadSettings('bad-store', { storage });

  assert.equal(settings.channelKey, 'bad-store');
  assert.equal(settings.enabled, true);
});

test('saveSettings sanitizes values and persists them', () => {
  const storage = stateApi.createMemoryStorage();

  const settings = stateApi.saveSettings('Store 123', {
    channelKey: 'My Store Channel',
    pollIntervalMs: 20000,
    retentionSeconds: 10,
    maxActiveVisitors: 500,
    sampleRate: 0,
  }, { storage });

  assert.equal(settings.channelKey, 'my-store-channel');
  assert.equal(settings.pollIntervalMs, 10000);
  assert.equal(settings.retentionSeconds, 30);
  assert.equal(settings.maxActiveVisitors, 50);
  assert.equal(settings.sampleRate, 1);
});

test('saveSettings can disable tracking explicitly', () => {
  const storage = stateApi.createMemoryStorage();
  const settings = stateApi.saveSettings('merchant-off', {
    enabled: false,
  }, { storage });

  assert.equal(settings.enabled, false);
});

test('saveSettings mirrors settings under the live channel key for storefront helpers', () => {
  const storage = stateApi.createMemoryStorage();

  const settings = stateApi.saveSettings('demo-store', {
    enabled: false,
    channelKey: 'ecwid-demo-store',
    retentionSeconds: 180,
  }, { storage });

  const mirrored = stateApi.loadSettings('ecwid-demo-store', { storage });

  assert.equal(settings.channelKey, 'ecwid-demo-store');
  assert.equal(mirrored.channelKey, 'ecwid-demo-store');
  assert.equal(mirrored.enabled, false);
  assert.equal(mirrored.retentionSeconds, 180);
});

test('loadState returns an empty state when missing or invalid', () => {
  const storage = stateApi.createMemoryStorage();
  storage.setItem('rmt-ecwid-state:merchant-invalid', 'oops');

  const state = stateApi.loadState('merchant-invalid', { storage });

  assert.deepEqual(state, {
    visitors: {},
    events: [],
    updated_at: 0,
  });
});

test('ingestEventBatch builds live metrics from bounded local state', () => {
  const storage = stateApi.createMemoryStorage();
  const settings = stateApi.saveSettings('merchant-a', {
    channelKey: 'merchant-a',
    retentionSeconds: 120,
    maxActiveVisitors: 2,
  }, { storage });

  stateApi.ingestEventBatch('merchant-a', {
    visitorId: 'visitor-1',
    page: { title: 'Product', path: '/p/desk-lamp', type: 'PRODUCT' },
    events: [
      { type: 'mousemove', x: 50, y: 20, scrollY: 18, timestamp: 1000 },
      { type: 'click', x: 52, y: 22, scrollY: 19, timestamp: 1001 },
      { type: 'rage_click', x: 52, y: 22, scrollY: 19, timestamp: 1002 },
    ],
  }, { storage, settings, now: 1002 });

  const snapshot = stateApi.buildSnapshot('merchant-a', { storage, settings, now: 1002 });

  assert.equal(snapshot.active_visitors, 1);
  assert.equal(snapshot.events_per_minute, 3);
  assert.equal(snapshot.rage_clicks, 1);
  assert.equal(snapshot.dead_clicks, 0);
  assert.equal(snapshot.visitors[0].cursor.x, 52);
  assert.equal(snapshot.visitors[0].scroll_y, 19);
});

test('ingestEventBatch ignores payloads when tracking is disabled', () => {
  const storage = stateApi.createMemoryStorage();
  const settings = stateApi.saveSettings('merchant-disabled', {
    enabled: false,
    channelKey: 'merchant-disabled',
  }, { storage });

  const snapshot = stateApi.ingestEventBatch('merchant-disabled', {
    visitorId: 'visitor-1',
    page: { title: 'Product', path: '/p/item', type: 'PRODUCT' },
    events: [{ type: 'click', x: 10, y: 20, scrollY: 0 }],
  }, { storage, settings, now: 100 });

  assert.equal(snapshot.active_visitors, 0);
  assert.equal(snapshot.events.length, 0);
});

test('ingestEventBatch ignores payloads without a visitor id', () => {
  const storage = stateApi.createMemoryStorage();
  const settings = stateApi.saveSettings('merchant-missing-visitor', {
    channelKey: 'merchant-missing-visitor',
  }, { storage });

  const snapshot = stateApi.ingestEventBatch('merchant-missing-visitor', {
    page: { title: 'Product', path: '/p/item', type: 'PRODUCT' },
    events: [{ type: 'click', x: 10, y: 20, scrollY: 0 }],
  }, { storage, settings, now: 100 });

  assert.equal(snapshot.active_visitors, 0);
  assert.equal(snapshot.events.length, 0);
});

test('ingestEventBatch queues visitors after the active limit is reached', () => {
  const storage = stateApi.createMemoryStorage();
  const settings = stateApi.saveSettings('merchant-queue', {
    channelKey: 'merchant-queue',
    maxActiveVisitors: 1,
  }, { storage });

  stateApi.ingestEventBatch('merchant-queue', {
    visitorId: 'visitor-1',
    page: { title: 'A', path: '/a', type: 'PAGE' },
    events: [{ type: 'click', x: 10, y: 20, scrollY: 0 }],
  }, { storage, settings, now: 100 });

  stateApi.ingestEventBatch('merchant-queue', {
    visitorId: 'visitor-2',
    page: { title: 'B', path: '/b', type: 'PAGE' },
    events: [{ type: 'click', x: 30, y: 40, scrollY: 20 }],
  }, { storage, settings, now: 101 });

  const snapshot = stateApi.buildSnapshot('merchant-queue', { storage, settings, now: 101 });
  const state = stateApi.loadState('merchant-queue', { storage });

  assert.equal(snapshot.active_visitors, 1);
  assert.equal(snapshot.queued_visitors, 1);
  assert.equal(state.visitors['visitor-2'].status, 'queued');
  assert.equal(snapshot.events.length, 1);
});

test('ingestEventBatch ignores invalid events and clamps page and coordinate values', () => {
  const storage = stateApi.createMemoryStorage();
  const settings = stateApi.saveSettings('merchant-sanitize', {
    channelKey: 'merchant-sanitize',
  }, { storage });

  stateApi.ingestEventBatch('merchant-sanitize', {
    visitorId: 'visitor-1',
    page: {
      title: 'x'.repeat(150),
      path: '/'.padEnd(220, 'z'),
      type: 'product-detail-long-name',
    },
    events: [
      { type: 'not-allowed', x: -500, y: 9999, scrollY: 'bad' },
      { type: 'click', x: -5, y: 200, scrollY: 999, timestamp: 200 },
    ],
  }, { storage, settings, now: 200 });

  const snapshot = stateApi.buildSnapshot('merchant-sanitize', { storage, settings, now: 200 });

  assert.equal(snapshot.events.length, 1);
  assert.equal(snapshot.visitors[0].cursor.x, 0);
  assert.equal(snapshot.visitors[0].cursor.y, 100);
  assert.equal(snapshot.visitors[0].scroll_y, 100);
  assert.equal(snapshot.visitors[0].page.title.length, 120);
  assert.equal(snapshot.visitors[0].page.type, 'PRODUCT-DETAIL-LONG-NAME'.slice(0, 40));
});

test('ingestEventBatch limits a batch to 25 events and keeps only the latest 120 stored events', () => {
  const storage = stateApi.createMemoryStorage();
  const settings = stateApi.saveSettings('merchant-bounds', {
    channelKey: 'merchant-bounds',
    retentionSeconds: 300,
  }, { storage });

  const oversizedBatch = Array.from({ length: 40 }, (_, index) => ({
    type: 'click',
    x: index,
    y: index,
    scrollY: index,
    timestamp: 1000 + index,
  }));

  stateApi.ingestEventBatch('merchant-bounds', {
    visitorId: 'visitor-bounds',
    page: { title: 'Bounds', path: '/bounds', type: 'PAGE' },
    events: oversizedBatch,
  }, { storage, settings, now: 1025 });

  for (let batchIndex = 0; batchIndex < 5; batchIndex += 1) {
    stateApi.ingestEventBatch('merchant-bounds', {
      visitorId: 'visitor-bounds',
      page: { title: 'Bounds', path: '/bounds', type: 'PAGE' },
      events: Array.from({ length: 25 }, (_, index) => ({
        type: 'mousemove',
        x: index,
        y: index,
        scrollY: index,
        timestamp: 1100 + batchIndex * 25 + index,
      })),
    }, { storage, settings, now: 1100 + batchIndex * 25 + 24 });
  }

  const state = stateApi.loadState('merchant-bounds', { storage });
  const snapshot = stateApi.buildSnapshot('merchant-bounds', { storage, settings, now: 1300 });

  assert.equal(state.visitors['visitor-bounds'].event_count, 150);
  assert.equal(state.events.length, 120);
  assert.equal(snapshot.events.length, 40);
});

test('buildSnapshot prunes expired visitors and events', () => {
  const storage = stateApi.createMemoryStorage();
  const settings = stateApi.saveSettings('merchant-b', {
    channelKey: 'merchant-b',
    retentionSeconds: 30,
  }, { storage });

  stateApi.ingestEventBatch('merchant-b', {
    visitorId: 'visitor-old',
    page: { title: 'Old page', path: '/old', type: 'PAGE' },
    events: [{ type: 'click', x: 10, y: 20, scrollY: 5, timestamp: 100 }],
  }, { storage, settings, now: 100 });

  const snapshot = stateApi.buildSnapshot('merchant-b', { storage, settings, now: 140 });

  assert.equal(snapshot.active_visitors, 0);
  assert.equal(snapshot.events.length, 0);
});

test('buildSnapshot sorts visitors by most recent activity', () => {
  const storage = stateApi.createMemoryStorage();
  const settings = stateApi.saveSettings('merchant-sort', {
    channelKey: 'merchant-sort',
  }, { storage });

  stateApi.ingestEventBatch('merchant-sort', {
    visitorId: 'visitor-1',
    page: { title: 'Older', path: '/older', type: 'PAGE' },
    events: [{ type: 'click', x: 10, y: 10, scrollY: 10, timestamp: 100 }],
  }, { storage, settings, now: 100 });

  stateApi.ingestEventBatch('merchant-sort', {
    visitorId: 'visitor-2',
    page: { title: 'Newer', path: '/newer', type: 'PAGE' },
    events: [{ type: 'click', x: 20, y: 20, scrollY: 20, timestamp: 120 }],
  }, { storage, settings, now: 120 });

  const snapshot = stateApi.buildSnapshot('merchant-sort', { storage, settings, now: 120 });

  assert.equal(snapshot.visitors[0].visitor_id, 'visitor-2');
  assert.equal(snapshot.visitors[1].visitor_id, 'visitor-1');
});

test('clearState removes saved tracking state', () => {
  const storage = stateApi.createMemoryStorage();
  const settings = stateApi.saveSettings('merchant-clear', {
    channelKey: 'merchant-clear',
  }, { storage });

  stateApi.ingestEventBatch('merchant-clear', {
    visitorId: 'visitor-1',
    page: { title: 'Page', path: '/page', type: 'PAGE' },
    events: [{ type: 'click', x: 10, y: 10, scrollY: 5 }],
  }, { storage, settings, now: 100 });

  stateApi.clearState('merchant-clear', { storage });

  assert.deepEqual(stateApi.loadState('merchant-clear', { storage }), {
    visitors: {},
    events: [],
    updated_at: 0,
  });
});

test('createPreviewSnapshot returns named preview data and does not leak mutations', () => {
  const preview = stateApi.createPreviewSnapshot('checkout_hesitation');

  assert.equal(preview.scenario, 'checkout_hesitation');
  assert.equal(preview.snapshot.dead_clicks, 4);
  assert.equal(preview.snapshot.active_visitors, 3);

  preview.snapshot.active_visitors = 999;
  const freshPreview = stateApi.createPreviewSnapshot('checkout_hesitation');

  assert.equal(freshPreview.snapshot.active_visitors, 3);
});

test('createPreviewSnapshot falls back to the default scenario for unknown names', () => {
  const preview = stateApi.createPreviewSnapshot('unknown-scenario');

  assert.equal(preview.scenario, 'product_friction');
  assert.equal(preview.label, 'Product page friction');
});

test('getScenarioList returns all preview scenarios', () => {
  const scenarios = stateApi.getScenarioList();

  assert.deepEqual(scenarios, [
    { key: 'product_friction', label: 'Product page friction' },
    { key: 'checkout_hesitation', label: 'Checkout hesitation' },
    { key: 'campaign_surge', label: 'Campaign surge' },
  ]);
});

test('ping broadcasts via localStorage and BroadcastChannel when available', () => {
  const originalBroadcastChannel = global.BroadcastChannel;
  const originalLocalStorage = global.localStorage;
  const messages = [];
  const storageWrites = [];

  class MockBroadcastChannel {
    constructor(name) {
      this.name = name;
    }

    postMessage(value) {
      messages.push({ name: this.name, value });
    }

    close() {}
  }

  global.BroadcastChannel = MockBroadcastChannel;
  global.localStorage = {
    setItem(key, value) {
      storageWrites.push({ type: 'set', key, value });
    },
    removeItem(key) {
      storageWrites.push({ type: 'remove', key });
    },
  };

  try {
    stateApi.ping('Merchant Channel');
  } finally {
    global.BroadcastChannel = originalBroadcastChannel;
    global.localStorage = originalLocalStorage;
  }

  assert.equal(messages.length, 1);
  assert.equal(messages[0].name, 'rmt-ecwid-ping:merchant-channel');
  assert.equal(messages[0].value.channelKey, 'merchant-channel');
  assert.deepEqual(storageWrites.map((entry) => entry.type), ['set', 'remove']);
});