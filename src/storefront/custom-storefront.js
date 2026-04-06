(() => {
  'use strict';

  const stateApi = window.EcwidRealtimeMouseTrackerState;

  if (!stateApi) {
    return;
  }

  const config = {
    channelKey: stateApi.normalizeStoreKey(window.RMTEcwidConfig && window.RMTEcwidConfig.channelKey),
    maxEventsPerBatch: 20,
    flushIntervalMs: 1000,
    heartbeatIntervalMs: 15000,
  };

  const visitorStorageKey = 'rmt-ecwid-visitor:' + config.channelKey;
  const visitorId = getVisitorId();
  const queuedEvents = [];
  const recentClicks = [];
  let currentPage = getPageMeta();
  let lastHeartbeatAt = Date.now();
  let lastMoveAt = 0;
  let lastScrollAt = 0;

  recordEvent('page_view');

  document.addEventListener('mousemove', (event) => {
    const now = Date.now();

    if (now - lastMoveAt < 120) {
      return;
    }

    lastMoveAt = now;
    recordEvent('mousemove', getPointerPayload(event.clientX, event.clientY));
  });

  window.addEventListener('scroll', () => {
    const now = Date.now();

    if (now - lastScrollAt < 150) {
      return;
    }

    lastScrollAt = now;
    recordEvent('scroll', { scrollY: getScrollPercent() });
  }, { passive: true });

  document.addEventListener('click', (event) => {
    const payload = getPointerPayload(event.clientX, event.clientY);
    recordEvent('click', payload);

    if (isRageClick(event.clientX, event.clientY)) {
      recordEvent('rage_click', payload);
    }

    if (!isInteractiveElement(event.target)) {
      recordEvent('dead_click', payload);
    }
  });

  document.addEventListener('touchstart', (event) => {
    const touch = event.touches && event.touches[0];
    if (!touch) {
      return;
    }

    recordEvent('tap', getPointerPayload(touch.clientX, touch.clientY));
  }, { passive: true });

  window.setInterval(flushEvents, config.flushIntervalMs);
  window.addEventListener('pagehide', () => flushEvents(true));

  if (window.Ecwid && window.Ecwid.OnAPILoaded) {
    window.Ecwid.OnAPILoaded.add(() => {
      document.documentElement.classList.add('rmt-ecwid-ready');

      if (isSelfTestPage()) {
        document.documentElement.classList.add('rmt-self-test');
      }
    });

    window.Ecwid.OnPageLoaded.add((page) => {
      currentPage = getPageMeta(page);
      recordEvent('page_view');
    });

    window.Ecwid.OnCartChanged.add(() => {
      currentPage = getPageMeta({ type: 'CART' });
      recordEvent('heartbeat');
    });

    window.Ecwid.OnOrderPlaced.add(() => {
      currentPage = getPageMeta({ type: 'ORDER_CONFIRMATION' });
      recordEvent('click');
    });
  }

  window.RMTEcwidTracker = {
    flush: flushEvents,
    getSnapshot: () => stateApi.buildSnapshot(config.channelKey),
    reset: () => {
      stateApi.clearState(config.channelKey);
      stateApi.ping(config.channelKey);
    },
  };

  function recordEvent(type, extra) {
    queuedEvents.push({
      type: type,
      timestamp: Math.floor(Date.now() / 1000),
      ...extra,
    });

    if (queuedEvents.length > config.maxEventsPerBatch * 3) {
      queuedEvents.splice(0, queuedEvents.length - config.maxEventsPerBatch * 3);
    }
  }

  function flushEvents() {
    const settings = stateApi.loadSettings(config.channelKey);

    if (!settings.enabled) {
      queuedEvents.length = 0;
      document.documentElement.classList.remove('rmt-ecwid-ready', 'rmt-self-test');
      return;
    }

    if (queuedEvents.length === 0 && Date.now() - lastHeartbeatAt >= config.heartbeatIntervalMs) {
      recordEvent('heartbeat');
    }

    if (queuedEvents.length === 0) {
      return;
    }

    const events = queuedEvents.splice(0, config.maxEventsPerBatch);
    lastHeartbeatAt = Date.now();

    stateApi.ingestEventBatch(config.channelKey, {
      visitorId: visitorId,
      page: currentPage,
      events: events,
    }, { settings: settings });

    stateApi.ping(config.channelKey);
  }

  function getVisitorId() {
    const stored = window.localStorage.getItem(visitorStorageKey);

    if (stored) {
      return stored;
    }

    const nextId = 'visitor-' + Math.random().toString(36).slice(2, 10);
    window.localStorage.setItem(visitorStorageKey, nextId);
    return nextId;
  }

  function getPageMeta(page) {
    const type = page && page.type ? String(page.type).toUpperCase() : 'PAGE';
    const title = document.title || 'Ecwid Storefront';

    return {
      title: title,
      path: window.location.pathname + window.location.search,
      type: type,
    };
  }

  function getPointerPayload(x, y) {
    return {
      x: toPercent(x, window.innerWidth),
      y: toPercent(y, window.innerHeight),
      scrollY: getScrollPercent(),
    };
  }

  function toPercent(value, max) {
    if (!max) {
      return null;
    }

    return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  }

  function getScrollPercent() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;

    if (scrollHeight <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(100, Math.round((scrollTop / scrollHeight) * 100)));
  }

  function isInteractiveElement(target) {
    return Boolean(target && target.closest && target.closest('a, button, input, select, textarea, [role="button"]'));
  }

  function isRageClick(x, y) {
    const now = Date.now();
    recentClicks.push({ x: x, y: y, timestamp: now });

    while (recentClicks.length && now - recentClicks[0].timestamp > 1200) {
      recentClicks.shift();
    }

    return recentClicks.length >= 3 && recentClicks.every((click) => {
      return Math.abs(click.x - x) < 24 && Math.abs(click.y - y) < 24;
    });
  }

  function isSelfTestPage() {
    return window.location.pathname.indexOf('storefront-test') !== -1 ||
      (window.RMTEcwidConfig && window.RMTEcwidConfig.selfTest === true);
  }
})();
