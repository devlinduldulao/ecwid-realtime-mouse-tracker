const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const distRoot = path.join(projectRoot, 'dist');

test('build-static creates the expected deployable files', () => {
  execFileSync(process.execPath, ['scripts/build-static.js'], {
    cwd: projectRoot,
    stdio: 'pipe',
  });

  assert.equal(fs.existsSync(path.join(distRoot, 'assets', 'marketplace', 'app-icon.svg')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'assets', 'marketplace', 'listing-banner.svg')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'assets', 'marketplace', 'screenshots', 'dashboard-live.png')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'public', 'index.html')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'public', 'storefront-test.html')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'src', 'shared', 'browser-state.js')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'src', 'storefront', 'custom-storefront.js')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'README.md')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'LICENSE')), true);
});