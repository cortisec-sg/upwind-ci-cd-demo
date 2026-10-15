import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const orders = [
  { id: 'ORD-1001', customer: 'Acme Retail', amount: 1299, status: 'shipped' },
  { id: 'ORD-1002', customer: 'Demo Enterprises', amount: 249, status: 'processing' },
  { id: 'ORD-1003', customer: 'Example Industries', amount: 899, status: 'delivered' }
];
const staticFiles = {
  '/': ['public/index.html', 'text/html; charset=utf-8'],
  '/app.js': ['public/app.js', 'application/javascript; charset=utf-8'],
  '/styles.css': ['public/styles.css', 'text/css; charset=utf-8']
};
let requestCount = 0;
const start = Date.now();

function send(res, status, payload, contentType = 'application/json; charset=utf-8') {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': contentType,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'",
    'referrer-policy': 'no-referrer'
  });
  res.end(body);
}
export function createServer() {
  return http.createServer(async (req, res) => {
    const started = performance.now();
    requestCount += 1;
    const url = new URL(req.url || '/', 'http://localhost');
    try {
      if (req.method === 'GET' && url.pathname in staticFiles) {
        const [file, type] = staticFiles[url.pathname];
        return send(res, 200, await readFile(resolve(root, file), 'utf8'), type);
      }
      if (req.method === 'GET' && (url.pathname === '/healthz' || url.pathname === '/readyz')) {
        return send(res, 200, { status: 'ok', service: 'upwind-demo-api' });
      }
      if (req.method === 'GET' && url.pathname === '/api/info') {
        return send(res, 200, {
          name: 'Upwind CI/CD Demo', version: '1.0.0',
          environment: process.env.NODE_ENV || 'local',
          message: 'Synthetic demo data only — no customer information.'
        });
      }
      if (req.method === 'GET' && url.pathname === '/api/orders') {
        return send(res, 200, { count: orders.length, orders });
      }
      if (req.method === 'GET' && /^\/api\/orders\/[A-Za-z0-9-]+$/.test(url.pathname)) {
        const id = url.pathname.split('/').pop();
        const item = orders.find(order => order.id === id);
        return item ? send(res, 200, item) : send(res, 404, { error: 'Order not found' });
      }
      if (req.method === 'GET' && url.pathname === '/api/metrics') {
        return send(res, 200, { requests: requestCount, uptimeSeconds: Math.floor((Date.now() - start) / 1000), timestamp: new Date().toISOString() });
      }
      if (req.method === 'POST' && url.pathname === '/api/checkout') {
        let raw = '';
        for await (const chunk of req) {
          raw += chunk.toString();
          if (raw.length > 4096) return send(res, 413, { error: 'Body too large' });
        }
        let body;
        try { body = JSON.parse(raw || '{}'); }
        catch { return send(res, 400, { error: 'Invalid JSON' }); }
        if (!Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > 10) {
          return send(res, 400, { error: 'quantity must be an integer from 1 to 10' });
        }
        return send(res, 201, { status: 'accepted', confirmation: 'DEMO-ONLY', quantity: body.quantity });
      }
      return send(res, 404, { error: 'Not found' });
    } catch (error) {
      console.error('request_error', error.message);
      return send(res, 500, { error: 'Internal server error' });
    } finally {
      const elapsed = Math.round(performance.now() - started);
      console.log(`${req.method} ${url.pathname} ${res.statusCode} ${elapsed}ms`);
    }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('PORT must be an integer in range 1..65535');
    process.exit(1);
  }
  createServer().listen(port, '0.0.0.0', () => console.log(`Upwind demo ready: http://localhost:${port}`));
}
