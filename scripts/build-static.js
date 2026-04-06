const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const distRoot = path.join(projectRoot, 'dist');
const directoriesToCopy = ['assets', 'public', 'src'];
const filesToCopy = ['README.md', 'LICENSE', '_headers'];
const rootIndexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Realtime Mouse Tracker for Ecwid</title>
  <meta http-equiv="refresh" content="0; url=./public/index.html">
  <link rel="canonical" href="./public/index.html">
  <script>
    window.location.replace('./public/index.html' + window.location.search + window.location.hash);
  </script>
</head>
<body>
  <p>Redirecting to <a href="./public/index.html">the dashboard</a>...</p>
</body>
</html>
`;

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

fs.writeFileSync(path.join(distRoot, 'index.html'), rootIndexHtml);

console.log('Built static output in dist/');