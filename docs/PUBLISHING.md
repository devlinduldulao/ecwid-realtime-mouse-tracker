# Publishing Checklist

This repository is technically ready for CI, build, and static deployment. It now also includes draft listing assets and copy, but it is not fully submission-ready until the store-specific metadata and final portal-specific exports are prepared.

## Current repository status

- Build pipeline exists
- CI workflow exists
- GitHub Pages deployment workflow exists
- Static app output exists in `dist/`
- Merchant dashboard and preview mode are implemented
- Draft listing icon, banner, and screenshots are included
- Draft marketplace copy is included
- Draft publishing profile metadata is included in `config/publishing-profile.json`

## Required publishing prep

### 1. Listing assets

Review and finalize artwork for:

- App icon
- Listing banner or hero image
- Merchant dashboard screenshots
- Optional setup or preview screenshots

Current source assets live in [assets/marketplace/](../assets/marketplace/README.md).

### 2. Marketplace copy

Finalize:

- App name
- Short description
- Full description
- Feature bullets
- Keywords or category tags if requested

Draft copy is available in [docs/PUBLISHING-COPY.md](./PUBLISHING-COPY.md).
- Draft structured metadata is available in `config/publishing-profile.json`.
- Support contact
- Privacy policy URL
- Terms of service URL if required

### 3. Ecwid app configuration

Before publishing, verify:

- Production app page URL points to your hosted `public/index.html`
- Storefront helper snippet uses your production static host URL
- Support email and documentation links are available publicly

### 4. Product limitation disclosure

Because this app is intentionally zero-infrastructure, the listing copy should clearly state:

- Preview mode is included
- Same-browser merchant self-test is supported
- Real cross-visitor live aggregation is not included in this free static version

## Release process

1. Run `npm ci`
2. Run `npm run lint`
3. Run `npm test`
4. Run `npm run build`
5. Upload or deploy `dist/`
6. Verify the hosted admin page and storefront helper
7. Capture final screenshots from the hosted app
8. Submit the app with final copy and assets

Use [docs/PUBLISHING-REVIEW.md](./PUBLISHING-REVIEW.md) as the final pre-submit check.