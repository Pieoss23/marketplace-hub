import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import esbuild from 'esbuild';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, 'dist');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
mkdirSync(join(outDir, 'content'), { recursive: true });

await esbuild.build({
  entryPoints: [join(root, 'src/popup/popup.ts')],
  outfile: join(outDir, 'popup.js'),
  bundle: true,
  format: 'esm',
  target: 'chrome110',
});

await esbuild.build({
  entryPoints: [join(root, 'src/content/demo-form-content-script.ts')],
  outfile: join(outDir, 'content/demo-form-content-script.js'),
  bundle: true,
  format: 'iife',
  target: 'chrome110',
});

cpSync(join(root, 'manifest.json'), join(outDir, 'manifest.json'));
cpSync(join(root, 'src/popup/popup.html'), join(outDir, 'popup.html'));
cpSync(join(root, 'src/popup/popup.css'), join(outDir, 'popup.css'));

if (existsSync(join(root, 'icons'))) {
  cpSync(join(root, 'icons'), join(outDir, 'icons'), { recursive: true });
}

console.log(`Unpacked extension built at ${outDir}`);
