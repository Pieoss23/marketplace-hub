import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

interface ExtensionManifest {
  readonly permissions?: readonly string[];
  readonly host_permissions?: readonly string[];
  readonly optional_host_permissions?: readonly string[];
  readonly content_scripts?: ReadonlyArray<{
    readonly matches?: readonly string[];
  }>;
}

function readManifest(): ExtensionManifest {
  const path = resolve(import.meta.dirname, '../manifest.json');
  return JSON.parse(readFileSync(path, 'utf8')) as ExtensionManifest;
}

describe('extension manifest safety boundaries', () => {
  it('uses only the permissions required by explicit user actions', () => {
    expect(readManifest().permissions).toEqual(['storage', 'activeTab']);
  });

  it('limits host access and content scripts to the controlled local environment', () => {
    const manifest = readManifest();

    expect(manifest.host_permissions).toEqual([
      'http://localhost/*',
      'http://127.0.0.1/*',
    ]);
    expect(manifest.optional_host_permissions).toEqual(['https://*/*', 'http://*/*']);
    expect(manifest.content_scripts).toHaveLength(1);
    expect(manifest.content_scripts?.[0]?.matches).toEqual([
      'http://localhost:4300/*',
      'http://127.0.0.1:4300/*',
    ]);
  });
});

describe('controlled demo page', () => {
  it('contains the three documented fields and no submit control', () => {
    const path = resolve(import.meta.dirname, '../demo/index.html');
    const html = readFileSync(path, 'utf8');
    const doc = new DOMParser().parseFromString(html, 'text/html');

    expect(doc.querySelector('#demo-title')).not.toBeNull();
    expect(doc.querySelector('#demo-description')).not.toBeNull();
    expect(doc.querySelector('#demo-price')).not.toBeNull();
    expect(doc.querySelector('button[type="submit"], input[type="submit"]')).toBeNull();
  });
});
