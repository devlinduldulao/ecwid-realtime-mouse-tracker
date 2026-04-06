#!/bin/bash
# Setup script for Realtime Mouse Tracker for Ecwid
# Run: bash scripts/setup.sh

set -e

echo "=== Realtime Mouse Tracker for Ecwid Setup ==="
echo ""

# Check Node.js version
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Node.js 20+ is required. Current: $(node -v 2>/dev/null || echo 'not installed')"
  exit 1
fi
echo "✅ Node.js $(node -v)"

echo ""
echo "Installing project metadata..."
npm install --package-lock-only

echo ""
echo "Running tests..."
npm test

echo ""
echo "Running lint..."
npm run lint

echo ""
echo "Building static output..."
npm run build

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Run: npm run preview"
echo "  2. Open: http://localhost:4173/public/index.html"
echo "  3. Replace STORE_ID in public/storefront-test.html before testing with a live Ecwid store"
echo ""
