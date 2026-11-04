// Run: node scripts/test-base64.js
// Tests the UTF-8 base64 encoder in src/utils/sync.js against Node's Buffer.
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'utils', 'sync.js'), 'utf8');
const start = src.indexOf('const B64 =');
const end = src.indexOf('// ---------- Publish');
const code = src.slice(start, end).replace('export const', 'const');
const fn = new Function(code + '\nreturn utf8ToBase64;')();

const samples = ['', 'a', 'ab', 'abc', 'Ané Müller', 'O’Brien – 日本語 😀', JSON.stringify({ n: 'Zoë' })];
let ok = true;
for (const s of samples) {
  const a = fn(s);
  const b = Buffer.from(s, 'utf8').toString('base64');
  if (a !== b) {
    ok = false;
    console.log('MISMATCH', JSON.stringify(s), a, b);
  }
}
console.log(ok ? 'base64 OK' : 'base64 FAILED');
process.exit(ok ? 0 : 1);
