/**
 * Expo web dev with local /api proxy → Railway (avoids browser CORS).
 * Usage: npm run web
 */
const { spawn } = require('child_process');
const http = require('http');
const https = require('https');
const path = require('path');
const { URL } = require('url');

const BACKEND = (
  process.env.RAILWAY_API_URL || 'https://sarh-app.up.railway.app'
).replace(/\/$/, '');
const PROXY_PORT = Number(process.env.WEB_DEV_PROXY_PORT || 8787);

function proxyRequest(clientReq, clientRes) {
  const target = new URL(clientReq.url || '/', BACKEND);
  const transport = target.protocol === 'https:' ? https : http;

  const upstream = transport.request(
    target,
    {
      method: clientReq.method,
      headers: {
        ...clientReq.headers,
        host: target.host,
      },
    },
    (upstreamRes) => {
      clientRes.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
      upstreamRes.pipe(clientRes);
    },
  );

  upstream.on('error', () => {
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({ success: false, messageAr: 'تعذّر الاتصال بالخادم' }));
    } else {
      clientRes.end();
    }
  });

  clientReq.pipe(upstream);
}

const proxy = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  proxyRequest(req, res);
});

proxy.listen(PROXY_PORT, '127.0.0.1', () => {
  console.log(`[web] API proxy http://127.0.0.1:${PROXY_PORT}/api → ${BACKEND}/api`);
});

process.env.EXPO_PUBLIC_API_URL = `http://127.0.0.1:${PROXY_PORT}`;
process.env.EXPO_PUBLIC_SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || BACKEND;

const child = spawn('npx', ['expo', 'start', '--web'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
  cwd: path.join(__dirname, '..'),
});

function shutdown(code) {
  proxy.close();
  process.exit(code ?? 0);
}

child.on('exit', (code) => shutdown(code ?? 0));
process.on('SIGINT', () => {
  child.kill('SIGINT');
  shutdown(0);
});
process.on('SIGTERM', () => {
  child.kill('SIGTERM');
  shutdown(0);
});
