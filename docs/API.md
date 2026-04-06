# Browser API Reference

This project exposes browser-side helpers instead of HTTP endpoints.

## Shared state module

File:

- [src/shared/browser-state.js](src/shared/browser-state.js)

Global:

```js
window.EcwidRealtimeMouseTrackerState
```

### `loadSettings(storeId)`

Loads merchant settings from browser storage.

### `saveSettings(storeId, partialSettings)`

Sanitizes and persists merchant settings.

### `ingestEventBatch(channelKey, payload, options)`

Writes a bounded event batch into browser-local tracking state.

Payload shape:

```js
{
  visitorId: 'visitor-123',
  page: {
    title: 'Product page',
    path: '/p/example',
    type: 'PRODUCT'
  },
  events: [
    { type: 'mousemove', x: 42, y: 18, scrollY: 12 },
    { type: 'click', x: 51, y: 39, scrollY: 24 }
  ]
}
```

### `buildSnapshot(channelKey)`

Returns dashboard metrics and recent visitor/event data.

Response shape:

```js
{
  active_visitors: 2,
  queued_visitors: 0,
  events_per_minute: 11,
  rage_clicks: 1,
  dead_clicks: 0,
  visitors: [],
  events: [],
  updated_at: 1710849600
}
```

### `clearState(channelKey)`

Removes browser-local tracking state for the given channel.

### `createPreviewSnapshot(name)`

Returns static preview data for a merchant walkthrough.

Available scenario names:

- `product_friction`
- `checkout_hesitation`
- `campaign_surge`

### `ping(channelKey)`

Broadcasts a refresh signal to other tabs in the same browser.