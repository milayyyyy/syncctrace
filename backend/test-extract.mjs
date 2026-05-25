// Test pdf-parse v1.1.1 against the real Google Drive PDF
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse'); // v1.1.1 — exports function directly

const FILE_ID = '1riaYzIrlW9N4nHF7FHgNGuIi7h4gjHAm';
const DOWNLOAD_URL = `https://drive.usercontent.google.com/download?id=${FILE_ID}&export=download&confirm=t`;

console.log('Downloading:', DOWNLOAD_URL);
const res = await fetch(DOWNLOAD_URL, {
  redirect: 'follow',
  signal: AbortSignal.timeout(30000),
  headers: { 'User-Agent': 'Mozilla/5.0' },
});
console.log('Status:', res.status, '| Content-Type:', res.headers.get('content-type'));

const buf = Buffer.from(await res.arrayBuffer());
console.log('Buffer:', buf.length, 'bytes | Magic:', buf.slice(0, 5).toString('latin1'));

try {
  const data = await pdfParse(buf);
  console.log('\n✅ pdfParse(buf) worked!');
  console.log('Pages:', data.numpages, '| Chars:', data.text.length);
  console.log('\nPreview:\n', data.text.slice(0, 600));
} catch (e) {
  console.log('\n❌ pdfParse failed:', e.message);
}
