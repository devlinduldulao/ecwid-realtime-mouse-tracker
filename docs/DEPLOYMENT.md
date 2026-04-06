# Deployment Guide

## Hosting model

Deploy this project as plain static files.

Good fits:

- GitHub Pages
- Netlify
- Cloudflare Pages
- Any object storage or CDN that can serve HTML, JS, and CSS

## Deploy steps

1. Publish the repository contents to a static host.
2. Set your Ecwid app page URL to the hosted `public/index.html` page.
3. Use the dashboard-generated snippet to reference the hosted storefront files.
4. Paste that snippet into Ecwid Design → Custom JavaScript.

## GitHub Pages with GitHub Actions

This repository includes a free GitHub Pages deployment workflow in `.github/workflows/deploy-pages.yml`.

1. Push the repository to GitHub and keep the default branch as `main`.
2. In GitHub, open Settings → Pages.
3. Under Build and deployment, set Source to `GitHub Actions`.
4. Push to `main` or run the `Deploy To GitHub Pages` workflow manually from the Actions tab.
5. Wait for the workflow to finish, then open `https://<github-username>.github.io/<repository-name>/`.

For this repository URL, the Pages URL will be:

```text
https://devlinduldulao.github.io/ecwid-realtime-mouse-tracker/
```

That root URL now serves the merchant dashboard directly. The legacy `public/index.html` path still works if you want to keep an existing Ecwid app page URL unchanged.

The dashboard now generates storefront snippet URLs using its current hosted base URL, which makes the same build work on GitHub Pages repository paths.

Run `npm run build` first if you want a clean deployable folder. Upload the contents of `dist/` to your static host.

## Required hosted files

- [public/index.html](public/index.html)
- [src/shared/browser-state.js](src/shared/browser-state.js)
- [src/storefront/custom-storefront.js](src/storefront/custom-storefront.js)
- [src/storefront/custom-storefront.css](src/storefront/custom-storefront.css)

## Example static URL layout

```text
https://your-static-host.example/public/index.html
https://your-static-host.example/src/shared/browser-state.js
https://your-static-host.example/src/storefront/custom-storefront.js
https://your-static-host.example/src/storefront/custom-storefront.css
```

## Ecwid configuration

- App page URL: your hosted site root or hosted `public/index.html`
- Storefront custom JavaScript: generated snippet from the dashboard
- Storefront custom CSS: optional hosted or pasted contents of [src/storefront/custom-storefront.css](src/storefront/custom-storefront.css)

## Limitation to communicate

This deployment model is free to host because it has no backend. The tradeoff is that it only supports preview mode and same-browser self-tests, not real cross-visitor live aggregation.