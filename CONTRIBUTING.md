# Contributing

## Getting started

1. Run `npm test`
2. Run `npm run lint`
3. Run `npm run build`
4. Run `npm run preview`
5. Open [public/index.html](public/index.html) and [public/storefront-test.html](public/storefront-test.html)

## Development workflow

1. Keep the app static-host friendly
2. Avoid introducing servers, databases, caches, or webhook dependencies
3. Add or update tests in [tests/browser-state.test.js](tests/browser-state.test.js) when behavior changes
4. Verify the merchant dashboard still works without Ecwid admin context

## Code style

- Prefer `const` and `let`
- Keep browser logic framework-free unless there is a strong reason not to
- Scope storefront styles tightly
- Treat browser storage as bounded, ephemeral state

## Important rules

- Do not reintroduce Express or server routes
- Do not add OAuth, webhook, or token handling
- Keep the product merchant-facing
- Document any limitation that comes from the zero-infrastructure design