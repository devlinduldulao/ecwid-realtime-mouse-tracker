const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const distRoot = path.join(projectRoot, 'dist');
const directoriesToCopy = ['assets', 'public', 'src'];
const filesToCopy = ['README.md', 'LICENSE', '_headers'];

function buildRootIndexHtml() {
  const publicIndexPath = path.join(projectRoot, 'public', 'index.html');
  const publicIndexHtml = fs.readFileSync(publicIndexPath, 'utf8');

  return publicIndexHtml
    .replace('href="logo.svg"', 'href="./public/logo.svg"')
    .replace('src="../src/shared/browser-state.js"', 'src="./src/shared/browser-state.js"')
    .replace('src="../src/admin/app.js"', 'src="./src/admin/app.js"');
}

fs.rmSync(distRoot, { recursive: true, force: true });
fs.mkdirSync(distRoot, { recursive: true });

for (const directory of directoriesToCopy) {
  fs.cpSync(path.join(projectRoot, directory), path.join(distRoot, directory), {
    recursive: true,
  });
}

for (const file of filesToCopy) {
  fs.copyFileSync(path.join(projectRoot, file), path.join(distRoot, file));
}

fs.writeFileSync(path.join(distRoot, 'index.html'), buildRootIndexHtml());

console.log('Built static output in dist/');