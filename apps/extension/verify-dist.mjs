import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const distDir = join(root, 'dist');
const requiredFiles = [
  'manifest.json',
  'popup.html',
  'popup.css',
  'popup.js',
  'content/demo-form-content-script.js',
];

const missingFiles = requiredFiles.filter((relativePath) => !existsSync(join(distDir, relativePath)));
if (missingFiles.length > 0) {
  throw new Error(`Extension build incompleta. File mancanti: ${missingFiles.join(', ')}`);
}

const manifest = JSON.parse(readFileSync(join(distDir, 'manifest.json'), 'utf8'));
if (manifest.manifest_version !== 3) {
  throw new Error("L'artefatto deve usare Chrome Manifest V3.");
}

const contentScriptFiles = manifest.content_scripts?.flatMap((entry) => entry.js ?? []) ?? [];
if (!contentScriptFiles.includes('content/demo-form-content-script.js')) {
  throw new Error("Il manifest non include il content script della pagina demo.");
}

const popupHtml = readFileSync(join(distDir, 'popup.html'), 'utf8');
if (!popupHtml.includes('src="popup.js"')) {
  throw new Error("Il popup compilato non carica popup.js.");
}

console.log(`Verified unpacked extension at ${distDir}`);
