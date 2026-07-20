import assert from 'node:assert/strict';
import test from 'node:test';

test('exports only type-level connector contracts at runtime', async () => {
  const connectorSdk = await import('../dist/index.js');

  assert.deepEqual(Object.keys(connectorSdk), []);
});
