(function (global, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  global.EcwidRealtimeMouseTrackerState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SETTINGS_PREFIX = 'rmt-ecwid-settings:';
  const STATE_PREFIX = 'rmt-ecwid-state:';
  const PING_PREFIX = 'rmt-ecwid-ping:';
  const ALLOWED_EVENT_TYPES = new Set([
    'page_view',
    'heartbeat',
    'mousemove',
    'scroll',
    'click',
    'tap',
    'rage_click',
    'dead_click',
  ]);

  const DEFAULT_SETTINGS = {
    enabled: true,
    channelKey: 'demo-store',
    pollIntervalMs: 2000,
    retentionSeconds: 120,
    maxActiveVisitors: 12,
    sampleRate: 100,
  };
  const fallbackStorage = createMemoryStorage();

  const PREVIEW_SCENARIOS = {
    product_friction: {
      label: 'Product page friction',
      snapshot: {
        active_visitors: 5,
        queued_visitors: 1,
        events_per_minute: 26,
        rage_clicks: 3,
        dead_clicks: 2,
        visitors: [
          {
            visitor_id: 'preview-1',
            status: 'active',
            page: { title: 'Bamboo Desk Lamp', path: '/p/bamboo-desk-lamp', type: 'PRODUCT' },
            cursor: { x: 68, y: 34 },
            scroll_y: 57,
            event_count: 14,
            rage_clicks: 2,
            dead_clicks: 0,
            last_event_type: 'rage_click',
            last_seen: Date.now() / 1000,
          },
          {
            visitor_id: 'preview-2',
            status: 'active',
            page: { title: 'Ceramic Pour Over Set', path: '/p/ceramic-pour-over-set', type: 'PRODUCT' },
            cursor: { x: 78, y: 46 },
            scroll_y: 62,
            event_count: 11,
            rage_clicks: 0,
            dead_clicks: 1,
            last_event_type: 'click',
            last_seen: Date.now() / 1000,
          },
          {
            visitor_id: 'preview-3',
            status: 'active',
            page: { title: 'Summer Drop', path: '/c/summer-drop', type: 'CATEGORY' },
            cursor: { x: 34, y: 28 },
            scroll_y: 23,
            event_count: 6,
            rage_clicks: 0,
            dead_clicks: 1,
            last_event_type: 'mousemove',
            last_seen: Date.now() / 1000,
          },
        ],
        events: [
          { type: 'rage_click', page: { path: '/p/bamboo-desk-lamp', type: 'PRODUCT' }, x: 71, y: 39, timestamp: Math.floor(Date.now() / 1000) - 9 },
          { type: 'dead_click', page: { path: '/c/summer-drop', type: 'CATEGORY' }, x: 36, y: 31, timestamp: Math.floor(Date.now() / 1000) - 16 },
          { type: 'click', page: { path: '/p/ceramic-pour-over-set', type: 'PRODUCT' }, x: 79, y: 51, timestamp: Math.floor(Date.now() / 1000) - 22 },
        ],
      },
    },
    checkout_hesitation: {
      label: 'Checkout hesitation',
      snapshot: {
        active_visitors: 3,
        queued_visitors: 0,
        events_per_minute: 17,
        rage_clicks: 1,
        dead_clicks: 4,
        visitors: [
          {
            visitor_id: 'preview-4',
            status: 'active',
            page: { title: 'Cart', path: '/bag', type: 'CART' },
            cursor: { x: 60, y: 83 },
            scroll_y: 91,
            event_count: 15,
            rage_clicks: 0,
            dead_clicks: 2,
            last_event_type: 'dead_click',
            last_seen: Date.now() / 1000,
          },
          {
            visitor_id: 'preview-5',
            status: 'active',
            page: { title: 'Checkout', path: '/checkout', type: 'CHECKOUT' },
            cursor: { x: 52, y: 78 },
            scroll_y: 88,
            event_count: 9,
            rage_clicks: 1,
            dead_clicks: 2,
            last_event_type: 'click',
            last_seen: Date.now() / 1000,
          },
        ],
        events: [
          { type: 'dead_click', page: { path: '/checkout', type: 'CHECKOUT' }, x: 66, y: 78, timestamp: Math.floor(Date.now() / 1000) - 12 },
          { type: 'click', page: { path: '/bag', type: 'CART' }, x: 53, y: 81, timestamp: Math.floor(Date.now() / 1000) - 21 },
          { type: 'scroll', page: { path: '/checkout', type: 'CHECKOUT' }, x: null, y: null, timestamp: Math.floor(Date.now() / 1000) - 24 },
        ],
      },
    },
    campaign_surge: {
      label: 'Campaign surge',
      snapshot: {
        active_visitors: 8,
        queued_visitors: 3,
        events_per_minute: 41,
        rage_clicks: 0,
        dead_clicks: 1,
        visitors: [
          {
            visitor_id: 'preview-6',
            status: 'active',
            page: { title: 'Landing Page', path: '/summer-launch', type: 'LANDING' },
            cursor: { x: 45, y: 24 },
            scroll_y: 18,
            event_count: 4,
            rage_clicks: 0,
            dead_clicks: 0,
            last_event_type: 'mousemove',
            last_seen: Date.now() / 1000,
          },
          {
            visitor_id: 'preview-7',
            status: 'active',
            page: { title: 'Summer Drop', path: '/c/summer-drop', type: 'CATEGORY' },
            cursor: { x: 24, y: 44 },
            scroll_y: 37,
            event_count: 7,
            rage_clicks: 0,
            dead_clicks: 0,
            last_event_type: 'click',
            last_seen: Date.now() / 1000,
          },
        ],
        events: [
          { type: 'page_view', page: { path: '/summer-launch', type: 'LANDING' }, x: null, y: null, timestamp: Math.floor(Date.now() / 1000) - 6 },
          { type: 'click', page: { path: '/c/summer-drop', type: 'CATEGORY' }, x: 24, y: 44, timestamp: Math.floor(Date.now() / 1000) - 11 },
          { type: 'scroll', page: { path: '/summer-launch', type: 'LANDING' }, x: null, y: null, timestamp: Math.floor(Date.now() / 1000) - 15 },
        ],
      },
    },
  };

  function createMemoryStorage() {
    const memory = new Map();

    return {
      getItem(key) {
        return memory.has(key) ? memory.get(key) : null;
      },
      setItem(key, value) {
        memory.set(key, String(value));
      },
      removeItem(key) {
        memory.delete(key);
      },
    };
  }

  function getStorage(options) {
    if (options && options.storage) {
      return options.storage;
    }

    try {
      const runtimeGlobal = typeof globalThis !== 'undefined' ? globalThis : global;
      const hasLocalStorage = runtimeGlobal && runtimeGlobal.localStorage;

      if (
        hasLocalStorage &&
        typeof runtimeGlobal.localStorage.getItem === 'function' &&
        typeof runtimeGlobal.localStorage.setItem === 'function' &&
        typeof runtimeGlobal.localStorage.removeItem === 'function'
      ) {
        runtimeGlobal.localStorage.getItem(SETTINGS_PREFIX + '__probe__');

        return {
          getItem(key) {
            return runtimeGlobal.localStorage.getItem(key);
          },
          setItem(key, value) {
            runtimeGlobal.localStorage.setItem(key, value);
          },
          removeItem(key) {
            runtimeGlobal.localStorage.removeItem(key);
          },
        };
      }
    } catch (error) {
      return fallbackStorage;
    }

    return fallbackStorage;
  }

  function normalizeStoreKey(value) {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '');

    return normalized || 'demo-store';
  }

  function sanitizeInteger(value, minimum, maximum, fallback) {
    const numeric = Number.parseInt(value, 10);

    if (!Number.isFinite(numeric)) {
      return fallback;
    }

    return Math.min(Math.max(numeric, minimum), maximum);
  }

  function sanitizeSettings(raw) {
    const value = raw || {};

    return {
      enabled: value.enabled !== false,
      channelKey: normalizeStoreKey(value.channelKey || DEFAULT_SETTINGS.channelKey),
      pollIntervalMs: sanitizeInteger(value.pollIntervalMs, 500, 10000, DEFAULT_SETTINGS.pollIntervalMs),
      retentionSeconds: sanitizeInteger(value.retentionSeconds, 30, 600, DEFAULT_SETTINGS.retentionSeconds),
      maxActiveVisitors: sanitizeInteger(value.maxActiveVisitors, 1, 50, DEFAULT_SETTINGS.maxActiveVisitors),
      sampleRate: sanitizeInteger(value.sampleRate, 1, 100, DEFAULT_SETTINGS.sampleRate),
    };
  }

  function readJson(storage, key, fallbackValue) {
    const raw = storage.getItem(key);

    if (!raw) {
      return fallbackValue;
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      return fallbackValue;
    }
  }

  function writeJson(storage, key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch (error) {
      if (error && (error.name === 'QuotaExceededError' || error.code === 22)) {
        storage.removeItem(key);
        try {
          storage.setItem(key, JSON.stringify(value));
        } catch (retryError) {
          return;
        }
      }
    }
  }

  function loadSettings(storeId, options) {
    const storage = getStorage(options);
    const key = SETTINGS_PREFIX + normalizeStoreKey(storeId);
    const stored = readJson(storage, key, null);

    if (!stored) {
      return { ...DEFAULT_SETTINGS, channelKey: normalizeStoreKey(storeId) };
    }

    return sanitizeSettings(stored);
  }

  function saveSettings(storeId, rawSettings, options) {
    const storage = getStorage(options);
    const storeKey = SETTINGS_PREFIX + normalizeStoreKey(storeId);
    const settings = sanitizeSettings({ ...loadSettings(storeId, options), ...rawSettings });
    writeJson(storage, storeKey, settings);

    if (normalizeStoreKey(storeId) !== settings.channelKey) {
      writeJson(storage, SETTINGS_PREFIX + settings.channelKey, settings);
    }

    return settings;
  }

  function emptyState() {
    return {
      visitors: {},
      events: [],
      updated_at: 0,
    };
  }

  function loadState(channelKey, options) {
    const storage = getStorage(options);
    return readJson(storage, STATE_PREFIX + normalizeStoreKey(channelKey), emptyState());
  }

  function saveState(channelKey, state, options) {
    const storage = getStorage(options);
    writeJson(storage, STATE_PREFIX + normalizeStoreKey(channelKey), state);
    return state;
  }

  function clearState(channelKey, options) {
    const storage = getStorage(options);
    storage.removeItem(STATE_PREFIX + normalizeStoreKey(channelKey));
  }

  function sanitizePage(page) {
    const value = page || {};

    return {
      title: String(value.title || 'Unknown page').slice(0, 120),
      path: String(value.path || '/').slice(0, 160),
      type: String(value.type || 'PAGE').slice(0, 40).toUpperCase(),
    };
  }

  function sanitizePercent(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return null;
    }

    return Math.min(Math.max(Math.round(numeric), 0), 100);
  }

  function sanitizeEvent(event, timestamp) {
    if (!event || !ALLOWED_EVENT_TYPES.has(event.type)) {
      return null;
    }

    return {
      type: event.type,
      timestamp: sanitizeInteger(event.timestamp || timestamp, 0, Number.MAX_SAFE_INTEGER, timestamp),
      x: sanitizePercent(event.x),
      y: sanitizePercent(event.y),
      scroll_y: sanitizePercent(event.scrollY || event.scroll_y),
      page: sanitizePage(event.page),
    };
  }

  function countVisitorsByStatus(state, status) {
    return Object.values(state.visitors).filter(function (visitor) {
      return visitor && visitor.status === status;
    }).length;
  }

  function pruneState(state, now, retentionSeconds) {
    const nextState = state || emptyState();
    const activeVisitors = {};

    Object.keys(nextState.visitors || {}).forEach(function (visitorId) {
      const visitor = nextState.visitors[visitorId];
      if (visitor && Number(visitor.last_seen || 0) >= now - retentionSeconds) {
        activeVisitors[visitorId] = visitor;
      }
    });

    nextState.visitors = activeVisitors;
    nextState.events = (nextState.events || []).filter(function (event) {
      return Number(event.timestamp || 0) >= now - retentionSeconds;
    }).slice(-120);
    nextState.updated_at = now;

    return nextState;
  }

  function ingestEventBatch(channelKey, payload, options) {
    const settings = sanitizeSettings(options && options.settings ? options.settings : loadSettings(channelKey, options));
    const timestamp = sanitizeInteger(options && options.now ? options.now : Math.floor(Date.now() / 1000), 0, Number.MAX_SAFE_INTEGER, Math.floor(Date.now() / 1000));
    let state = pruneState(loadState(channelKey, options), timestamp, settings.retentionSeconds);
    const visitorId = String(payload && payload.visitorId ? payload.visitorId : '').slice(0, 80);

    if (!visitorId || settings.enabled === false) {
      return buildSnapshot(channelKey, options);
    }

    const existing = state.visitors[visitorId] || null;
    const status = existing && existing.status
      ? existing.status
      : countVisitorsByStatus(state, 'active') < settings.maxActiveVisitors
        ? 'active'
        : 'queued';

    const visitor = {
      visitor_id: visitorId,
      first_seen: existing && existing.first_seen ? existing.first_seen : timestamp,
      last_seen: timestamp,
      status: status,
      page: sanitizePage(payload.page),
      cursor: existing && existing.cursor ? existing.cursor : null,
      scroll_y: existing && existing.scroll_y !== undefined ? existing.scroll_y : null,
      event_count: existing && existing.event_count ? existing.event_count : 0,
      rage_clicks: existing && existing.rage_clicks ? existing.rage_clicks : 0,
      dead_clicks: existing && existing.dead_clicks ? existing.dead_clicks : 0,
      last_event_type: existing && existing.last_event_type ? existing.last_event_type : 'page_view',
    };

    const events = Array.isArray(payload && payload.events) ? payload.events.slice(0, 25) : [];

    events.forEach(function (rawEvent) {
      const event = sanitizeEvent({ ...rawEvent, page: payload.page }, timestamp);

      if (!event || status !== 'active') {
        return;
      }

      visitor.event_count += 1;
      visitor.last_event_type = event.type;

      if (event.x !== null && event.y !== null) {
        visitor.cursor = { x: event.x, y: event.y };
      }

      if (event.scroll_y !== null) {
        visitor.scroll_y = event.scroll_y;
      }

      if (event.type === 'rage_click') {
        visitor.rage_clicks += 1;
      }

      if (event.type === 'dead_click') {
        visitor.dead_clicks += 1;
      }

      state.events.push({
        visitor_id: visitorId,
        page: event.page,
        type: event.type,
        x: event.x,
        y: event.y,
        scroll_y: event.scroll_y,
        timestamp: event.timestamp,
      });
    });

    state.visitors[visitorId] = visitor;
    state = pruneState(state, timestamp, settings.retentionSeconds);
    saveState(channelKey, state, options);
    return buildSnapshot(channelKey, { ...options, settings: settings, now: timestamp });
  }

  function buildSnapshot(channelKey, options) {
    const settings = sanitizeSettings(options && options.settings ? options.settings : loadSettings(channelKey, options));
    const now = sanitizeInteger(options && options.now ? options.now : Math.floor(Date.now() / 1000), 0, Number.MAX_SAFE_INTEGER, Math.floor(Date.now() / 1000));
    const state = pruneState(loadState(channelKey, options), now, settings.retentionSeconds);
    const visitors = Object.values(state.visitors || {})
      .filter(Boolean)
      .sort(function (left, right) {
        return Number(right.last_seen || 0) - Number(left.last_seen || 0);
      });

    const activeVisitors = visitors.filter(function (visitor) {
      return visitor.status === 'active';
    });

    const queuedVisitors = visitors.length - activeVisitors.length;
    let eventsPerMinute = 0;
    let rageClicks = 0;
    let deadClicks = 0;

    const recentEvents = (state.events || []).slice().reverse().filter(function (event) {
      const withinMinute = Number(event.timestamp || 0) >= now - 60;

      if (withinMinute) {
        eventsPerMinute += 1;
      }

      if (event.type === 'rage_click') {
        rageClicks += 1;
      }

      if (event.type === 'dead_click') {
        deadClicks += 1;
      }

      return true;
    }).slice(0, 40);

    return {
      active_visitors: activeVisitors.length,
      queued_visitors: queuedVisitors,
      events_per_minute: eventsPerMinute,
      rage_clicks: rageClicks,
      dead_clicks: deadClicks,
      visitors: activeVisitors,
      events: recentEvents,
      updated_at: now,
    };
  }

  function createPreviewSnapshot(name) {
    const scenario = PREVIEW_SCENARIOS[name] || PREVIEW_SCENARIOS.product_friction;
    return {
      scenario: name in PREVIEW_SCENARIOS ? name : 'product_friction',
      label: scenario.label,
      snapshot: JSON.parse(JSON.stringify(scenario.snapshot)),
    };
  }

  function getScenarioList() {
    return Object.keys(PREVIEW_SCENARIOS).map(function (key) {
      return { key: key, label: PREVIEW_SCENARIOS[key].label };
    });
  }

  function ping(channelKey) {
    const timestamp = Date.now();

    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(PING_PREFIX + normalizeStoreKey(channelKey));
      channel.postMessage({ channelKey: normalizeStoreKey(channelKey), timestamp: timestamp });
      channel.close();
    }

    try {
      if (global.localStorage) {
        const pingKey = PING_PREFIX + normalizeStoreKey(channelKey);
        global.localStorage.setItem(pingKey, String(timestamp));
        global.localStorage.removeItem(pingKey);
      }
    } catch (error) {
      return;
    }
  }

  return {
    DEFAULT_SETTINGS: { ...DEFAULT_SETTINGS },
    createMemoryStorage: createMemoryStorage,
    normalizeStoreKey: normalizeStoreKey,
    sanitizeSettings: sanitizeSettings,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    loadState: loadState,
    clearState: clearState,
    ingestEventBatch: ingestEventBatch,
    buildSnapshot: buildSnapshot,
    createPreviewSnapshot: createPreviewSnapshot,
    getScenarioList: getScenarioList,
    ping: ping,
  };
});