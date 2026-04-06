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
  assert.equal(fs.existsSync(path.join(distRoot, 'index.html')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'src', 'shared', 'browser-state.js')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'src', 'storefront', 'custom-storefront.js')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'README.md')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'LICENSE')), true);
});

test('build-static keeps public pages compatible with GitHub Pages repository paths', () => {
  execFileSync(process.execPath, ['scripts/build-static.js'], {
    cwd: projectRoot,
    stdio: 'pipe',
  });

  const adminHtml = fs.readFileSync(path.join(distRoot, 'public', 'index.html'), 'utf8');
  const storefrontHtml = fs.readFileSync(path.join(distRoot, 'public', 'storefront-test.html'), 'utf8');
  const rootIndexHtml = fs.readFileSync(path.join(distRoot, 'index.html'), 'utf8');

  assert.match(rootIndexHtml, /window\.location\.replace\('\.\/public\/index\.html'/);
  assert.match(rootIndexHtml, /href="\.\/public\/index\.html"/);

  assert.match(adminHtml, /<script src="\.\.\/src\/shared\/browser-state\.js"><\/script>/);
  assert.match(adminHtml, /<script src="\.\.\/src\/admin\/app\.js"><\/script>/);
  assert.doesNotMatch(adminHtml, /<script src="\/src\//);

  assert.match(storefrontHtml, /<link rel="stylesheet" href="\.\.\/src\/storefront\/custom-storefront\.css">/);
  assert.match(storefrontHtml, /<script src="\.\.\/src\/shared\/browser-state\.js"><\/script>/);
  assert.match(storefrontHtml, /<script src="\.\.\/src\/storefront\/custom-storefront\.js"><\/script>/);
  assert.doesNotMatch(storefrontHtml, /(?:href|src)="\/src\//);
});