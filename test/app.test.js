import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from '../src/server.js';

async function withServer(run) {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await run(base); }
  finally { await new Promise((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
}
test('health endpoint is successful', async () => withServer(async base => {
  const response = await fetch(`${base}/healthz`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'ok');
}));
test('orders API uses synthetic data', async () => withServer(async base => {
  const response = await fetch(`${base}/api/orders`);
  const json = await response.json();
  assert.equal(response.status, 200);
  assert.equal(json.count, 3);
  assert.equal(json.orders[0].id, 'ORD-1001');
}));
test('checkout validates quantity', async () => withServer(async base => {
  const invalid = await fetch(`${base}/api/checkout`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ quantity: -10 })
  });
  assert.equal(invalid.status, 400);
  const valid = await fetch(`${base}/api/checkout`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ quantity: 2 })
  });
  assert.equal(valid.status, 201);
  assert.equal((await valid.json()).status, 'accepted');
}));
test('app page is available', async () => withServer(async base => {
  const response = await fetch(base);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /SECURE BUILD LAB/);
}));
