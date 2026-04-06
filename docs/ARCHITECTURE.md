# Architecture

Realtime Mouse Tracker for Ecwid is intentionally built as a static, merchant-facing app.

## Design constraints

- No Node.js server runtime
- No database
- No Redis
- No webhook receiver
- No OAuth flow
- Only browser storage and static files

## Runtime surfaces

### 1. Admin dashboard

Files:

- [public/index.html](public/index.html)
- [src/admin/app.js](src/admin/app.js)

This is the store owner surface. It renders the dashboard, saves merchant settings locally, offers preview scenarios, and reads browser-local snapshots.

### 2. Shared browser state

File:

- [src/shared/browser-state.js](src/shared/browser-state.js)

This module holds bounded settings and event snapshots in `localStorage`. It also uses `BroadcastChannel` and storage pings so the admin tab and storefront tab can refresh each other in the same browser.

### 3. Storefront helper

Files:

- [src/storefront/custom-storefront.js](src/storefront/custom-storefront.js)
- [src/storefront/custom-storefront.css](src/storefront/custom-storefront.css)

This script captures cursor, click, tap, scroll, and page-view signals from the Ecwid storefront and writes them into the shared browser state.

## Data flow

```text
Merchant opens dashboard tab
  -> dashboard loads local settings
  -> dashboard polls browser snapshot state

Merchant opens storefront tab in same browser
  -> storefront helper captures activity
  -> helper writes bounded events into localStorage
  -> helper broadcasts a ping to the dashboard tab
  -> dashboard refreshes and renders updated metrics
```

## Why this works

- Free hosting is enough because everything is static
- Preview mode gives merchants a useful demo without live traffic
- Same-browser self-test lets a merchant validate setup without backend costs

## What it cannot do

Because there is no shared collector, one shopper browser cannot send data to another merchant browser across the network. That means this Ecwid version does not provide true multi-visitor live production tracking.

If a future version needs real cross-visitor live analytics, it must add a collector endpoint and a shared state layer. That would be a different architecture than this repository currently targets.