// Custom Next.js server untuk Railway deployment
const { createServer } = require('http');
const { parse } = require('url');
const path = require('path');
const fs = require('fs');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT) || 3000;

// Detect standalone build dari Next.js output: 'standalone'
const standalonePath = path.join(__dirname, '.next', 'standalone', 'server.js');

if (fs.existsSync(standalonePath)) {
  console.log('[Server] Detected standalone build, using Next.js built server');
  process.chdir(path.join(__dirname, '.next', 'standalone'));
  require('./.next/standalone/server.js');
} else {
  console.log('[Server] No standalone build, starting dev/prod server');
  const next = require('next');
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error handling', err);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    }).listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
  });
}
