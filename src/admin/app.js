(() => {
  'use strict';

  const stateApi = window.EcwidRealtimeMouseTrackerState;

  if (!stateApi) {
    return;
  }

  const metricNodes = document.querySelectorAll('[data-rmt-metric]');
  const visitorsNode = document.querySelector('[data-rmt-visitors]');
  const eventsNode = document.querySelector('[data-rmt-events]');
  const lastUpdatedNode = document.querySelector('[data-rmt-last-updated]');
  const storeIdNode = document.querySelector('[data-rmt-store-id]');
  const modeLabelNode = document.querySelector('[data-rmt-mode-label]');
  const modeHelpNode = document.querySelector('[data-rmt-mode-help]');
  const insightSummaryNode = document.querySelector('[data-rmt-insight-summary]');
  const statusNode = document.getElementById('status-message');
  const trackerEnabledNode = document.getElementById('tracker-enabled');
  const channelKeyNode = document.getElementById('channel-key');
  const pollIntervalNode = document.getElementById('poll-interval');
  const retentionNode = document.getElementById('retention-seconds');
  const maxVisitorsNode = document.getElementById('max-visitors');
  const installSnippetNode = document.getElementById('install-snippet');
  const previewScenarioNode = document.getElementById('preview-scenario');
  const refreshButton = document.getElementById('refresh-btn');
  const previewButton = document.getElementById('preview-btn');
  const resetButton = document.getElementById('reset-btn');
  const saveButton = document.getElementById('save-btn');
  const previewStorageKey = 'rmt-ecwid-preview-mode';
  const previewScenarioStorageKey = 'rmt-ecwid-preview-scenario';
  const currentScriptUrl = document.currentScript && document.currentScript.src
    ? new URL(document.currentScript.src, window.location.href)
    : null;

  let storeId = 'demo-store';
  let storeLabel = 'Standalone preview';
  let settings = stateApi.loadSettings(storeId);
  let pollTimer = null;
  let broadcastChannel = null;
  let previewEnabled = window.localStorage.getItem(previewStorageKey) === 'on';
  let previewScenario = window.localStorage.getItem(previewScenarioStorageKey) || 'product_friction';

  stateApi.getScenarioList().forEach((scenario) => {
    const option = document.createElement('option');
    option.value = scenario.key;
    option.textContent = scenario.label;
    previewScenarioNode.appendChild(option);
  });

  previewScenarioNode.value = previewScenario;

  if (window.EcwidApp && typeof window.EcwidApp.init === 'function') {
    const app = window.EcwidApp.init({ appId: 'realtime-mouse-tracker' });

    if (app && typeof app.getPayload === 'function') {
      app.getPayload((payload) => {
        if (payload && payload.store_id) {
          storeId = String(payload.store_id);
          storeLabel = payload.store_name || 'Ecwid store';
        }

        bootstrap();
      });
    } else {
      bootstrap();
    }
  } else {
    bootstrap();
  }

  refreshButton.addEventListener('click', refreshSnapshot);
  previewButton.addEventListener('click', togglePreview);
  resetButton.addEventListener('click', resetState);
  saveButton.addEventListener('click', saveSettings);
  previewScenarioNode.addEventListener('change', () => {
    previewScenario = previewScenarioNode.value;
    window.localStorage.setItem(previewScenarioStorageKey, previewScenario);
    refreshSnapshot();
  });

  function bootstrap() {
    settings = hydrateSettings();
    renderSettings();
    attachRealtimeListeners();
    refreshSnapshot();
    startPolling();
    resizeIframe();
  }

  function hydrateSettings() {
    const loaded = stateApi.loadSettings(storeId);

    if (loaded.channelKey === 'demo-store' && storeId !== 'demo-store') {
      return stateApi.saveSettings(storeId, { channelKey: 'ecwid-' + stateApi.normalizeStoreKey(storeId) });
    }

    return loaded;
  }

  function renderSettings() {
    trackerEnabledNode.checked = settings.enabled;
    channelKeyNode.value = settings.channelKey;
    pollIntervalNode.value = settings.pollIntervalMs;
    retentionNode.value = settings.retentionSeconds;
    maxVisitorsNode.value = settings.maxActiveVisitors;
    storeIdNode.textContent = storeLabel + ' · store ' + storeId;
    updateInstallSnippet();
  }

  function saveSettings() {
    clearFieldErrors();

    const errors = validateSettingsInputs();
    if (errors.length) {
      errors.forEach(function (err) { markFieldError(err.field, err.message); });
      showStatus('Please fix the highlighted fields.', true);
      return;
    }

    settings = stateApi.saveSettings(storeId, {
      enabled: trackerEnabledNode.checked,
      channelKey: channelKeyNode.value,
      pollIntervalMs: pollIntervalNode.value,
      retentionSeconds: retentionNode.value,
      maxActiveVisitors: maxVisitorsNode.value,
    });

    renderSettings();
    attachRealtimeListeners();
    startPolling();
    stateApi.ping(settings.channelKey);
    showStatus('Saved locally for this merchant browser session.', false);
    refreshSnapshot();
  }

  function validateSettingsInputs() {
    const errors = [];
    const channelRaw = channelKeyNode.value.trim();

    if (!channelRaw) {
      errors.push({ field: channelKeyNode, message: 'Channel key cannot be empty.' });
    } else if (/[^a-zA-Z0-9\-]/.test(channelRaw)) {
      errors.push({ field: channelKeyNode, message: 'Only letters, numbers, and hyphens are allowed.' });
    }

    const pollRaw = Number(pollIntervalNode.value);
    if (!Number.isFinite(pollRaw) || pollRaw < 500 || pollRaw > 10000) {
      errors.push({ field: pollIntervalNode, message: 'Must be between 500 and 10000.' });
    }

    const retentionRaw = Number(retentionNode.value);
    if (!Number.isFinite(retentionRaw) || retentionRaw < 30 || retentionRaw > 600) {
      errors.push({ field: retentionNode, message: 'Must be between 30 and 600.' });
    }

    const maxVisitorsRaw = Number(maxVisitorsNode.value);
    if (!Number.isFinite(maxVisitorsRaw) || maxVisitorsRaw < 1 || maxVisitorsRaw > 50) {
      errors.push({ field: maxVisitorsNode, message: 'Must be between 1 and 50.' });
    }

    return errors;
  }

  function markFieldError(inputNode, message) {
    inputNode.classList.add('input-error');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    inputNode.parentNode.appendChild(errorDiv);
  }

  function clearFieldErrors() {
    document.querySelectorAll('.field-error').forEach(function (el) { el.remove(); });
    document.querySelectorAll('.input-error').forEach(function (el) { el.classList.remove('input-error'); });
  }

  function refreshSnapshot() {
    syncPreviewButton();

    let snapshot;

    if (previewEnabled) {
      const preview = stateApi.createPreviewSnapshot(previewScenario);
      snapshot = preview.snapshot;
      modeLabelNode.textContent = 'Preview mode';
      modeHelpNode.textContent = 'Showing ' + preview.label + '. This never writes to live browser state.';
    } else {
      snapshot = stateApi.buildSnapshot(settings.channelKey);
      modeLabelNode.textContent = 'Live self-test mode';
      modeHelpNode.textContent = 'Showing browser-local activity from channel ' + settings.channelKey + '.';
    }

    renderMetrics(snapshot);
    renderVisitors(snapshot.visitors || []);
    renderEvents(snapshot.events || []);
    renderInsight(snapshot);
    lastUpdatedNode.textContent = snapshot.updated_at
      ? 'Updated ' + new Date(snapshot.updated_at * 1000).toLocaleTimeString()
      : 'Waiting for data...';
    resizeIframe();
  }

  function renderMetrics(snapshot) {
    metricNodes.forEach((node) => {
      const key = node.getAttribute('data-rmt-metric');
      node.textContent = String(snapshot[key] || 0);
    });
  }

  function renderVisitors(visitors) {
    if (!visitors.length) {
      visitorsNode.innerHTML = '<tr><td colspan="4" class="table-empty">No active visitors yet. Open the storefront in the same browser or switch to preview mode.</td></tr>';
      return;
    }

    visitorsNode.innerHTML = visitors.map((visitor) => {
      const cursor = visitor.cursor ? visitor.cursor.x + '%, ' + visitor.cursor.y + '%' : 'No pointer';
      const scroll = visitor.scroll_y !== null && visitor.scroll_y !== undefined ? visitor.scroll_y + '%' : 'Unknown';
      const signals = [
        visitor.last_event_type || 'page_view',
        visitor.rage_clicks ? visitor.rage_clicks + ' rage' : null,
        visitor.dead_clicks ? visitor.dead_clicks + ' dead' : null,
      ].filter(Boolean).map((signal) => '<span class="signal-tag">' + escapeHtml(signal) + '</span>').join(' ');

      return '<tr>' +
        '<td><strong>' + escapeHtml(visitor.page.title || 'Unknown page') + '</strong><br><span class="status-row">' + escapeHtml(visitor.page.path || '/') + '</span></td>' +
        '<td>' + escapeHtml(cursor) + '</td>' +
        '<td>' + escapeHtml(scroll) + '</td>' +
        '<td>' + signals + '</td>' +
        '</tr>';
    }).join('');
  }

  function renderEvents(events) {
    if (!events.length) {
      eventsNode.innerHTML = '<div class="event-item table-empty">No events yet. The feed fills as soon as the storefront helper flushes activity.</div>';
      return;
    }

    eventsNode.innerHTML = events.map((event) => {
      const summary = [event.page && event.page.type ? event.page.type : 'PAGE', event.page && event.page.path ? event.page.path : '/'].join(' · ');
      return '<div class="event-item">' +
        '<strong>' + escapeHtml(event.type.replace(/_/g, ' ')) + '</strong>' +
        '<span class="status-row">' + escapeHtml(summary) + '</span>' +
        '<span class="mono-inline">' + new Date((event.timestamp || 0) * 1000).toLocaleTimeString() + '</span>' +
        '</div>';
    }).join('');
  }

  function renderInsight(snapshot) {
    if (!snapshot.events || !snapshot.events.length) {
      insightSummaryNode.textContent = 'No recent signals yet. Preview mode gives a realistic merchant walkthrough; live mode needs the storefront helper running in the same browser.';
      return;
    }

    if (snapshot.rage_clicks >= 2) {
      insightSummaryNode.textContent = 'Repeated rage clicks suggest a blocked action or unclear control state. Check product options, sticky buttons, and any delayed add-to-cart feedback.';
      return;
    }

    if (snapshot.dead_clicks >= 2) {
      insightSummaryNode.textContent = 'Dead clicks are elevated. Merchants should review decorative banners, disabled buttons, or layout overlaps around the affected pages.';
      return;
    }

    if (snapshot.events_per_minute >= 25) {
      insightSummaryNode.textContent = 'Traffic is active and clean enough to compare landing-page intent against product-page follow-through. Watch where activity starts thinning out.';
      return;
    }

    insightSummaryNode.textContent = 'Signals look steady. Keep testing the storefront path that matters most, then use recent events to decide whether the friction is in discovery, product detail, or checkout.';
  }

  function togglePreview() {
    previewEnabled = !previewEnabled;
    window.localStorage.setItem(previewStorageKey, previewEnabled ? 'on' : 'off');
    refreshSnapshot();
  }

  function syncPreviewButton() {
    previewButton.textContent = previewEnabled ? 'Return to Live' : 'Enable Preview';
    previewButton.setAttribute('aria-pressed', previewEnabled ? 'true' : 'false');
  }

  function resetState() {
    stateApi.clearState(settings.channelKey);
    stateApi.ping(settings.channelKey);
    showStatus('Cleared browser-local session data for channel ' + settings.channelKey + '.', false);
    refreshSnapshot();
  }

  function updateInstallSnippet() {
    const hostedBaseUrl = getHostedBaseUrl();
    const snippet = [
      '<script src="' + hostedBaseUrl + '/src/shared/browser-state.js"></script>',
      '<script>',
      'window.RMTEcwidConfig = {',
      '  channelKey: ' + JSON.stringify(settings.channelKey),
      '};',
      '</script>',
      '<script src="' + hostedBaseUrl + '/src/storefront/custom-storefront.js"></script>',
    ].join('\n');

    installSnippetNode.value = snippet;
  }

  function getHostedBaseUrl() {
    try {
      if (currentScriptUrl) {
        return new URL('../..', currentScriptUrl).href.replace(/\/$/, '');
      }

      const currentPath = window.location.pathname;

      if (currentPath.endsWith('/public/index.html')) {
        return new URL('..', window.location.href).href.replace(/\/$/, '');
      }

      return new URL('.', window.location.href).href.replace(/\/$/, '');
    } catch (error) {
      return 'https://YOUR-STATIC-HOST';
    }
  }

  function startPolling() {
    if (pollTimer) {
      window.clearInterval(pollTimer);
    }

    pollTimer = window.setInterval(refreshSnapshot, settings.pollIntervalMs);
  }

  function attachRealtimeListeners() {
    if (broadcastChannel) {
      broadcastChannel.close();
      broadcastChannel = null;
    }

    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel('rmt-ecwid-ping:' + settings.channelKey);
      broadcastChannel.addEventListener('message', refreshSnapshot);
    }
  }

  window.addEventListener('storage', (event) => {
    if (event.key === 'rmt-ecwid-ping:' + settings.channelKey) {
      refreshSnapshot();
    }
  });

  function resizeIframe() {
    if (!window.EcwidApp || typeof window.EcwidApp.setSize !== 'function') {
      return;
    }

    window.setTimeout(() => {
      window.EcwidApp.setSize({ height: document.body.scrollHeight + 24 });
    }, 100);
  }

  function showStatus(message, isError) {
    statusNode.textContent = message;
    statusNode.style.color = isError ? '#b42318' : '#0d7a5f';
    resizeIframe();
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(value)));
    return div.innerHTML;
  }
})();
