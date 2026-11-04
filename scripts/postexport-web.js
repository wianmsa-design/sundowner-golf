// Run after `expo export --platform web`: makes the site installable (Add to Home Screen) on iPhone/Android.
const fs = require('fs');
const path = require('path');
const dist = path.join(__dirname, '..', 'dist');
const base = '/sundowner-golf';

fs.copyFileSync(path.join(__dirname, '..', 'assets', 'icon.png'), path.join(dist, 'icon.png'));
fs.writeFileSync(
  path.join(dist, 'manifest.json'),
  JSON.stringify({
    name: 'Sundowner Golf',
    short_name: 'Sundowner',
    start_url: `${base}/`,
    scope: `${base}/`,
    display: 'standalone',
    background_color: '#1a1a1a',
    theme_color: '#1a1a1a',
    icons: [{ src: `${base}/icon.png`, sizes: '1024x1024', type: 'image/png', purpose: 'any' }],
  }, null, 2)
);

const htmlPath = path.join(dist, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const tags = `
    <link rel="manifest" href="${base}/manifest.json" />
    <link rel="apple-touch-icon" href="${base}/icon.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Sundowner" />
    <meta name="theme-color" content="#1a1a1a" />`;
if (!html.includes('rel="manifest"')) html = html.replace('</head>', tags + '\n  </head>');
fs.writeFileSync(htmlPath, html);
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
console.log('postexport-web done');
