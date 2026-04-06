const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const distRoot = path.join(projectRoot, 'dist');
const directoriesToCopy = ['assets', 'public', 'src'];
const filesToCopy = ['README.md', 'LICENSE', '_headers'];

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

console.log('Built static output in dist/');