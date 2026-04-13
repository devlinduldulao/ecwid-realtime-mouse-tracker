(() => {
  'use strict';

  const stateApi = window.EcwidRealtimeMouseTrackerState;

  if (!stateApi) {
    return;
  }

  const metricNodes = document.querySelectorAll('[data-rmt-metric]');
  const metricCards = document.querySelectorAll('[data-rmt-metric-card]');
  const sourceBadges = document.querySelectorAll('[data-rmt-source-badge]');
  const visitorsNode = document.querySelector('[data-rmt-visitors]');
  const eventsNode = document.querySelector('[data-rmt-events]');
  const lastUpdatedNode = document.querySelector('[data-rmt-last-updated]');
  const storeIdNode = document.querySelector('[data-rmt-store-id]');
  const modeLabelNode = document.querySelector('[data-rmt-mode-label]');
  const modeBadgeNode = document.querySelector('[data-rmt-mode-badge]');
  const modeHelpNode = document.querySelector('[data-rmt-mode-help]');
  const modeBannerNode = document.getElementById('mode-banner');
  const insightSummaryNode = document.querySelector('[data-rmt-insight-summary]');
  const insightSummaryLiveNode = document.querySelector('[data-rmt-insight-summary-live]');
  const liveHelpCallout = document.getElementById('live-help-callout');
  const previewControls = document.getElementById('preview-controls');
  const liveInsight = document.getElementById('live-insight');
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
  const copySnippetButton = document.getElementById('copy-snippet-btn');
  const guidePanel = document.getElementById('guide-panel');
  const guideDismiss = document.getElementById('guide-dismiss');
  const guideReopen = document.getElementById('guide-reopen');
  const previewStorageKey = 'rmt-ecwid-preview-mode';
  const previewScenarioStorageKey = 'rmt-ecwid-preview-scenario';
  const guideDismissedKey = 'rmt-ecwid-guide-dismissed';
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

  initGuide();
  initTabs();

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
  if (copySnippetButton) {
    copySnippetButton.addEventListener('click', copySnippet);
  }
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
    inputNode.setAttribute('aria-invalid', 'true');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    inputNode.parentNode.appendChild(errorDiv);
  }

  function clearFieldErrors() {
    document.querySelectorAll('.field-error').forEach(function (el) { el.remove(); });
    document.querySelectorAll('.input-error').forEach(function (el) {
      el.classList.remove('input-error');
      el.removeAttribute('aria-invalid');
    });
  }

  function refreshSnapshot() {
    syncPreviewButton();
    updateModeUI();

    let snapshot;

    if (previewEnabled) {
      const preview = stateApi.createPreviewSnapshot(previewScenario);
      snapshot = preview.snapshot;
      modeLabelNode.textContent = 'Preview mode — Sample data';
      modeHelpNode.textContent = 'Showing "' + preview.label + '" scenario. This is sample data to help you learn the dashboard. It never writes to your real data.';
    } else {
      snapshot = stateApi.buildSnapshot(settings.channelKey);
      modeLabelNode.textContent = 'Live self-test mode';
      modeHelpNode.textContent = 'Showing real browser-local activity from channel "' + settings.channelKey + '". Open your storefront in another tab to generate data.';
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

  function updateModeUI() {
    const isPreview = previewEnabled;

    modeBannerNode.setAttribute('data-mode', isPreview ? 'preview' : 'live');

    if (modeBadgeNode) {
      modeBadgeNode.className = isPreview ? 'mode-badge mode-badge--preview' : 'mode-badge mode-badge--live';
    }

    sourceBadges.forEach(function (badge) {
      if (isPreview) {
        badge.className = 'source-badge source-badge--preview';
        badge.textContent = 'Preview — Sample Data';
      } else {
        badge.className = 'source-badge source-badge--live';
        badge.textContent = 'Live Data';
      }
    });

    metricCards.forEach(function (card) {
      if (isPreview) {
        card.setAttribute('data-preview-watermark', '');
      } else {
        card.removeAttribute('data-preview-watermark');
      }
    });

    if (previewControls) {
      previewControls.style.display = isPreview ? '' : 'none';
    }
    if (liveInsight) {
      liveInsight.style.display = isPreview ? 'none' : '';
    }
    if (liveHelpCallout) {
      liveHelpCallout.style.display = isPreview ? 'none' : '';
    }
  }

  function renderMetrics(snapshot) {
    metricNodes.forEach((node) => {
      const key = node.getAttribute('data-rmt-metric');
      node.textContent = String(snapshot[key] || 0);
    });
  }

  function renderVisitors(visitors) {
    if (!visitors.length) {
      visitorsNode.innerHTML = '<tr><td colspan="4">' +
        '<div class="empty-state">' +
        '<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="18" stroke="#ccc" stroke-width="2"/><path d="M14 24s2 3 6 3 6-3 6-3M15 16h.01M25 16h.01" stroke="#ccc" stroke-width="2" stroke-linecap="round"/></svg>' +
        '<strong>No visitors yet</strong>' +
        '<p>Open your Ecwid storefront in another tab (same browser) and browse around. Visitors will appear here in real time. Or try <strong>Preview mode</strong> to see sample data.</p>' +
        '</div></td></tr>';
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
      eventsNode.innerHTML = '<div class="empty-state">' +
        '<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect x="6" y="8" width="28" height="24" rx="3" stroke="#ccc" stroke-width="2"/><path d="M12 16h16M12 22h10" stroke="#ccc" stroke-width="2" stroke-linecap="round"/></svg>' +
        '<strong>No signals yet</strong>' +
        '<p>Signals appear as clicks, scrolls, and mouse movements are captured from your storefront tab. Try Preview mode to see what this looks like.</p>' +
        '</div>';
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
    const targetNode = previewEnabled ? insightSummaryNode : insightSummaryLiveNode;

    if (!targetNode) {
      return;
    }

    if (!snapshot.events || !snapshot.events.length) {
      targetNode.textContent = previewEnabled
        ? 'Select a preview scenario to see a realistic sample of storefront friction data.'
        : 'No live signals yet. Open your storefront in another tab to start tracking, or try Preview mode to see sample data.';
      return;
    }

    if (snapshot.rage_clicks >= 2) {
      targetNode.textContent = 'Repeated rage clicks suggest a blocked action or unclear control state. Check product options, sticky buttons, and any delayed add-to-cart feedback.';
      return;
    }

    if (snapshot.dead_clicks >= 2) {
      targetNode.textContent = 'Dead clicks are elevated. Review decorative banners, disabled buttons, or layout overlaps around the affected pages.';
      return;
    }

    if (snapshot.events_per_minute >= 25) {
      targetNode.textContent = 'Traffic is active and clean. Compare landing-page intent against product-page follow-through. Watch where activity starts thinning out.';
      return;
    }

    targetNode.textContent = 'Signals look steady. Keep testing the storefront path that matters most, then use recent events to decide whether the friction is in discovery, product detail, or checkout.';
  }

  function togglePreview() {
    previewEnabled = !previewEnabled;
    window.localStorage.setItem(previewStorageKey, previewEnabled ? 'on' : 'off');
    refreshSnapshot();
  }

  function syncPreviewButton() {
    previewButton.textContent = previewEnabled ? 'Return to Live Data' : 'Try Preview (Sample Data)';
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
    statusNode.style.color = isError ? '#b42318' : '#0b5d49';
    resizeIframe();
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(value)));
    return div.innerHTML;
  }

  function initGuide() {
    if (!guidePanel || !guideDismiss || !guideReopen) {
      return;
    }

    if (window.localStorage.getItem(guideDismissedKey) === 'yes') {
      guidePanel.style.display = 'none';
      guideReopen.style.display = '';
    }

    guideDismiss.addEventListener('click', function () {
      guidePanel.style.display = 'none';
      guideReopen.style.display = '';
      window.localStorage.setItem(guideDismissedKey, 'yes');
      resizeIframe();
    });

    guideReopen.addEventListener('click', function () {
      guidePanel.style.display = '';
      guideReopen.style.display = 'none';
      window.localStorage.removeItem(guideDismissedKey);
      resizeIframe();
    });
  }

  function initTabs() {
    var tabButtons = document.querySelectorAll('.tab-btn[data-tab]');
    tabButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetId = btn.getAttribute('data-tab');
        tabButtons.forEach(function (other) {
          other.setAttribute('aria-selected', 'false');
        });
        btn.setAttribute('aria-selected', 'true');

        var tabContents = btn.closest('.panel').querySelectorAll('.tab-content');
        tabContents.forEach(function (content) {
          if (content.id === targetId) {
            content.setAttribute('data-active', '');
          } else {
            content.removeAttribute('data-active');
          }
        });
        resizeIframe();
      });
    });
  }

  function copySnippet() {
    if (!installSnippetNode || !installSnippetNode.value) {
      return;
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(installSnippetNode.value).then(function () {
        showCopyFeedback();
      }).catch(function () {
        fallbackCopy();
      });
    } else {
      fallbackCopy();
    }
  }

  function fallbackCopy() {
    installSnippetNode.select();
    document.execCommand('copy');
    showCopyFeedback();
  }

  function showCopyFeedback() {
    if (!copySnippetButton) {
      return;
    }

    var originalText = copySnippetButton.textContent;
    copySnippetButton.textContent = 'Copied!';
    setTimeout(function () {
      copySnippetButton.textContent = originalText;
    }, 2000);
  }
})();
