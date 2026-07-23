import { describe, expect, it } from 'vitest';

import { buildApiOriginPermission } from '../src/lib/host-permission';

describe('buildApiOriginPermission', () => {
  it('limits a requested permission to the configured API origin', () => {
    expect(buildApiOriginPermission('https://api.marketplace-hub.example/v1/')).toBe(
      'https://api.marketplace-hub.example/*',
    );
    expect(buildApiOriginPermission('http://localhost:3000/api')).toBe(
      'http://localhost:3000/*',
    );
  });

  it('rejects malformed URLs and unsupported protocols', () => {
    expect(() => buildApiOriginPermission('not-a-url')).toThrow("L'URL API non è valido.");
    expect(() => buildApiOriginPermission('file:///tmp/api')).toThrow(
      "L'URL API deve usare HTTP o HTTPS.",
    );
  });

  it('rejects credentials embedded in the URL', () => {
    expect(() => buildApiOriginPermission('https://user:secret@example.com/api')).toThrow(
      "L'URL API non deve contenere credenziali.",
    );
  });
});
