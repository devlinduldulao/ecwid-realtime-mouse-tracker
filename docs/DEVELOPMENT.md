# Development Guide

## Local workflow

```bash
npm test
npm run test:ui
npm run lint
npm run build
npm run preview
```

Open these pages locally:

- `http://localhost:4173/public/index.html`
- `http://localhost:4173/public/storefront-test.html`

## Editing the dashboard

- Change layout in [public/index.html](public/index.html)
- Change behavior in [src/admin/app.js](src/admin/app.js)

The dashboard must still work when `EcwidApp` is unavailable so it remains testable outside the Ecwid admin iframe.

## Editing shared state

- Update [src/shared/browser-state.js](src/shared/browser-state.js)
- Add or update unit tests in [tests/browser-state.test.js](tests/browser-state.test.js)

Keep state bounded and ephemeral. Do not let event buffers grow without limits.

## Editing the storefront helper

- Change capture logic in [src/storefront/custom-storefront.js](src/storefront/custom-storefront.js)
- Change self-test visuals in [src/storefront/custom-storefront.css](src/storefront/custom-storefront.css)

Replace `STORE_ID` in [public/storefront-test.html](public/storefront-test.html) with a real Ecwid store ID before testing against a live storefront widget.

## Testing

`npm test` runs the Node test runner against the shared-state module.

`npm run test:ui` runs Playwright browser tests against the built admin dashboard.

`npm run lint` uses `node --check` to catch syntax errors in the browser scripts.

`npm run build` creates a static `dist/` output that is ready to upload to a static host.

Manual verification:

1. Open the admin dashboard page.
2. Save a channel key.
3. Open the storefront self-test page with the same browser profile.
4. Move the mouse, scroll, and click.
5. Confirm the dashboard updates in live self-test mode.