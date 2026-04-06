# Realtime Mouse Tracker for Ecwid — AI Agent Instructions

## Project overview

| Key | Value |
|-----|-------|
| Product | Realtime Mouse Tracker for Ecwid |
| Platform | Ecwid by Lightspeed |
| Runtime | Static files + browser APIs |
| Storage | Browser localStorage + BroadcastChannel |
| Audience | Ecwid merchants using the admin dashboard |
| Hosting | Static hosting only |

## Core rules

### 1. Keep this project zero-infrastructure

- No Node.js server runtime
- No database
- No Redis
- No OAuth flow
- No webhook pipeline

### 2. This is merchant-facing

- The main product surface is the Ecwid admin dashboard
- Storefront code exists only to feed the merchant dashboard during preview and self-test
- Do not add shopper-facing UI unless the merchant explicitly needs it for setup feedback

### 3. Respect the architectural limit

- Browser-only state can support preview mode and same-browser self-tests
- It cannot support real cross-visitor production tracking without a shared collector
- If asked for true live shopper aggregation, document the limitation clearly before implementing workarounds

### 4. Design System and Native Look & Feel

- Building an **Ecwid native look and feel** is the number one priority for this app module.
- Strictly adhere to the [Lightspeed Design System](https://brand.lightspeedhq.com/document/170#/brand-system/logo-1).
- **Logo Usage**: Keep logo simple and monochrome (Charcoal gray on light backgrounds, pure white on dark backgrounds). Ensure WCAG AA contrast or better. Never gray out, distort, outline, or add effects.
- **Brandmark (The Flame)**: Retain Fire Red when used on white backgrounds. Respect clearspace rules (a full flame width for the main logo, half flame width for the flame alone) and minimum sizes (80px for logo, 15px for flame).
- Ensure all admin surface components integrate seamlessly with Ecwid's dashboard aesthetics.

## File map

| File | Purpose |
|------|---------|
| [public/index.html](public/index.html) | Merchant dashboard iframe page |
| [public/storefront-test.html](public/storefront-test.html) | Local storefront self-test page |
| [src/admin/app.js](src/admin/app.js) | Merchant dashboard runtime |
| [src/shared/browser-state.js](src/shared/browser-state.js) | Shared browser storage and snapshot logic |
| [src/storefront/custom-storefront.js](src/storefront/custom-storefront.js) | Storefront interaction capture |
| [src/storefront/custom-storefront.css](src/storefront/custom-storefront.css) | Storefront self-test styles |
| [tests/browser-state.test.js](tests/browser-state.test.js) | Unit tests |

## Quality gates

- Every behavior change must include or update unit tests
- Run `npm test` and `npm run lint` after edits
- Keep edits small and consistent with the static-host model