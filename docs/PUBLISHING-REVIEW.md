# Publication Readiness Review

## Ready now

- Static merchant dashboard is implemented
- Preview mode is implemented
- Same-browser live self-test is implemented
- Build, lint, unit tests, and Playwright UI tests pass locally
- GitHub Actions CI workflow exists
- GitHub Pages deployment workflow exists
- Listing icon, banner, and refreshed screenshot source assets now exist in `assets/marketplace/`
- Marketplace copy draft now exists in `docs/PUBLISHING-COPY.md`

## Still required before submission

- Replace placeholder support and policy URLs with public production values
- Export or resize the SVG artwork to whatever raster dimensions the Ecwid submission portal currently requires
- Capture or refresh final dashboard screenshots from your production-hosted app
- Verify the production app page URL inside the Ecwid app configuration
- Verify the generated storefront helper snippet uses your production static host URL

## Risk notes

- The app must clearly disclose that true cross-visitor live aggregation is out of scope for this free static build
- Submission requirements can change in the Ecwid portal, so final image dimensions and copy fields must be checked there before upload