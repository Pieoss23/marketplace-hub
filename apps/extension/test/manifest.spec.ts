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

  it('provides a reordered semantic form without known field ids or submit control', () => {
    const path = resolve(import.meta.dirname, '../demo/semantic.html');
    const html = readFileSync(path, 'utf8');
    const doc = new DOMParser().parseFromString(html, 'text/html');

    expect(doc.querySelector('#demo-title, #demo-description, #demo-price')).toBeNull();
    expect(doc.querySelector('[name="headline"]')).not.toBeNull();
    expect(doc.querySelector('[name="body-copy"]')).not.toBeNull();
    expect(doc.querySelector('[name="listing-amount"]')).not.toBeNull();
    expect(doc.querySelector('button[type="submit"], input[type="submit"]')).toBeNull();
  });
});

describe('popup visual structure', () => {
  it('keeps the functional hooks inside the compact Marketplace Hub layout', () => {
    const path = resolve(import.meta.dirname, '../src/popup/popup.html');
    const html = readFileSync(path, 'utf8');
    const doc = new DOMParser().parseFromString(html, 'text/html');

    expect(doc.querySelector('.popup-header .brand-mark')?.textContent).toBe('M');
    expect(doc.querySelector('.popup-header .eyebrow')?.textContent).toContain(
      'Marketplace Hub',
    );
    expect(doc.querySelectorAll('section.panel')).toHaveLength(4);
    expect(doc.querySelector('#login.primary-action')).not.toBeNull();
    expect(doc.querySelector('#copy-summary.primary-action')).not.toBeNull();
    expect(doc.querySelector('#fill-demo-form.demo-action')).not.toBeNull();
    expect(doc.querySelector('#announcement-select')).not.toBeNull();
  });
});
