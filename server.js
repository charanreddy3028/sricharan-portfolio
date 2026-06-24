const http = require('http');
const fs = require('fs');
const path = require('path');

// Load .env without requiring dotenv package
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
}

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function makeResWrapper(res) {
  let code = 200;
  return {
    setHeader: (k, v) => res.setHeader(k, v),
    status(c) { code = c; return this; },
    json(data) {
      if (!res.headersSent) res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    },
    end() {
      if (!res.headersSent) res.writeHead(code);
      res.end();
    },
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  if (pathname.startsWith('/api/')) {
    const name = pathname.slice(5).split('/')[0];
    const handlerPath = path.join(__dirname, 'api', `${name}.js`);

    if (!fs.existsSync(handlerPath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Not found' }));
    }

    const ct = req.headers['content-type'] || '';
    if (ct.includes('application/json')) {
      req.body = await parseBody(req);
    } else {
      req.body = {};
    }

    try {
      // Clear require cache so edits take effect without restart
      delete require.cache[require.resolve(handlerPath)];
      const handler = require(handlerPath);
      await handler(req, makeResWrapper(res));
    } catch (err) {
      console.error('API error:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    }
    return;
  }

  // Serve uploads as static files
  if (pathname.startsWith('/uploads/')) {
    const uploadFile = path.join(UPLOADS_DIR, pathname.slice(9));
    if (!uploadFile.startsWith(UPLOADS_DIR)) { res.writeHead(403); return res.end('Forbidden'); }
    return fs.readFile(uploadFile, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': 'application/pdf' });
      res.end(data);
    });
  }

  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); return res.end('Forbidden');
  }

  try {
    if (fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Dev server → http://localhost:${PORT}`);
  console.log('Mail: set GMAIL_USER + GMAIL_APP_PASSWORD in .env to enable contact form');
});
