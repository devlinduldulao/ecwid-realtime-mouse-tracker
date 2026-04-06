# Realtime Mouse Tracker for Ecwid

Static, merchant-facing Ecwid app for previewing and self-testing live cursor and interaction signals without a database, Redis, or a persistent Node.js server.

## What this project is

- Ecwid admin dashboard intended for the store owner
- Storefront helper that writes bounded tracking state into browser storage
- Static-host friendly app that can be deployed to GitHub Pages, Netlify, Cloudflare Pages, or any plain file host

## What this project is not

- Not a shopper-facing plugin UI
- Not a multi-visitor production analytics backend
- Not a webhook, OAuth, or database app

Without a shared collector endpoint, the dashboard can only read preview data and same-browser self-test activity. That keeps the project free to host, but it also means live cross-visitor tracking is out of scope for this Ecwid build.

## Publishing assets

This repository now contains draft publishing assets and screenshots for the Ecwid listing:

- [assets/marketplace/app-icon.svg](assets/marketplace/app-icon.svg)
- [assets/marketplace/listing-banner.svg](assets/marketplace/listing-banner.svg)
- [assets/marketplace/screenshots/dashboard-live.png](assets/marketplace/screenshots/dashboard-live.png)
- [assets/marketplace/screenshots/dashboard-preview.png](assets/marketplace/screenshots/dashboard-preview.png)
- [assets/marketplace/screenshots/setup-snippet.png](assets/marketplace/screenshots/setup-snippet.png)

They are suitable as source assets, but you should still verify the exact image dimensions and file formats required by the Ecwid submission portal before upload.

To refresh the screenshots from the current UI, run `npm run capture:marketplace` while the local preview server is available.

Draft marketplace copy is included in [docs/PUBLISHING-COPY.md](docs/PUBLISHING-COPY.md), and the current gap review is in [docs/PUBLISHING-REVIEW.md](docs/PUBLISHING-REVIEW.md).

## Quick start

```bash
npm test
npm run test:ui
npm run lint
npm run build
npm run preview
```

Then open:

- `http://localhost:4173/public/index.html`
- `http://localhost:4173/public/storefront-test.html`

Replace `STORE_ID` in [public/storefront-test.html](public/storefront-test.html) with your real Ecwid store ID for a local self-test.

## Merchant workflow

1. Open the admin app at [public/index.html](public/index.html) inside the Ecwid admin iframe or in a normal browser tab.
2. Save a tracking channel in the dashboard settings.
3. Host this repo as static files.
4. Paste the generated snippet from the dashboard into Ecwid Design → Custom JavaScript.
5. Open the storefront in another tab using the same browser profile.
6. Watch the dashboard update from browser-local state.

## Project structure

```text
public/
  index.html                 Merchant dashboard iframe page
  storefront-test.html       Local storefront self-test page
src/
  admin/
    app.js                   Dashboard runtime
  shared/
    browser-state.js         Browser-local settings and snapshot store
  storefront/
    custom-storefront.css    Light storefront indicator styles
    custom-storefront.js     Storefront event capture and local sync
tests/
  browser-state.test.js      Unit tests for browser state logic
```

## Deployment

Use any static hosting provider. The Ecwid app page should point to your hosted [public/index.html](public/index.html). The storefront helper snippet should reference your hosted [src/shared/browser-state.js](src/shared/browser-state.js) and [src/storefront/custom-storefront.js](src/storefront/custom-storefront.js).

`npm run build` produces a deployable `dist/` directory that preserves the same `public/` and `src/` paths expected by the dashboard and storefront snippet.

## CI/CD

GitHub Actions workflows are included for:

- CI validation on pushes and pull requests in [.github/workflows/ci.yml](.github/workflows/ci.yml)
- GitHub Pages deployment from `main` in [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml)

Browser-level admin UI tests are implemented with Playwright in [tests/ui/admin-dashboard.spec.js](tests/ui/admin-dashboard.spec.js).

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md), and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the details.

For submission prep, use [docs/PUBLISHING.md](docs/PUBLISHING.md), [docs/PUBLISHING-COPY.md](docs/PUBLISHING-COPY.md), and [docs/PUBLISHING-REVIEW.md](docs/PUBLISHING-REVIEW.md).