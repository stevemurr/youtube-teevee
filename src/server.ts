import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import path from 'path';
import { existsSync } from 'fs';
import { initDatabase } from './services/database';
import { config } from './config';
import { logger } from './utils/logger';
import type { HonoEnv } from './types';

import authRoutes from './routes/auth';
import channelRoutes from './routes/channels';
import timelineRoutes from './routes/timeline';
import settingsRoutes from './routes/settings';
import dataRefreshRoutes from './routes/data-refresh';
import setupRoutes from './routes/setup';

const app = new Hono<HonoEnv>();

app.use('*', cors());

// Request logging for API routes
app.use('/api/*', async (c, next) => {
  const start = performance.now();
  await next();
  const ms = (performance.now() - start).toFixed(0);
  logger.info(`${c.req.method} ${c.req.path} ${c.res.status} ${ms}ms`);
});

app.route('/api/auth', authRoutes);
app.route('/api/channels', channelRoutes);
app.route('/api/timeline', timelineRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/data-refresh', dataRefreshRoutes);
app.route('/api/setup', setupRoutes);

app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Central error handler — expected HTTP errors are warnings, everything else is an error
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    logger.warn(`${c.req.method} ${c.req.path} → ${err.status}: ${err.message}`);
    return c.json({ error: err.message }, err.status);
  }
  logger.error(`Unhandled error in ${c.req.method} ${c.req.path}:`, err);
  return c.json({ error: 'Internal server error' }, 500);
});

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
};

const mimeType = (filePath: string) =>
  MIME[filePath.slice(filePath.lastIndexOf('.')).toLowerCase()] ?? 'application/octet-stream';

// When running as a compiled binary, frontend-dist/ lives adjacent to the executable.
// In dev mode, process.execPath points to the bun CLI so this check fails gracefully.
function findFrontendDist(): string | null {
  if (process.env.FRONTEND_DIST) return process.env.FRONTEND_DIST;
  const adjacentToExe = path.join(path.dirname(process.execPath), 'frontend-dist');
  if (existsSync(adjacentToExe)) return adjacentToExe;
  const adjacentToCwd = path.join(process.cwd(), 'frontend-dist');
  if (existsSync(adjacentToCwd)) return adjacentToCwd;
  return null;
}

async function startServer() {
  await initDatabase();

  const frontendDist = findFrontendDist();

  if (frontendDist) {
    // Serve static assets; fall back to index.html for SPA client-side routing.
    app.use('*', async (c, next) => {
      const filePath = path.join(frontendDist, c.req.path);
      const file = Bun.file(filePath);
      if (await file.exists()) return new Response(file, { headers: { 'Content-Type': mimeType(filePath) } });
      return next();
    });
    app.get('*', () => {
      const indexPath = path.join(frontendDist, 'index.html');
      return new Response(Bun.file(indexPath), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    });
  }

  logger.info(`Database: ${config.databasePath}`);
  logger.info(`Port:     ${config.port}`);
  if (frontendDist) logger.info(`Frontend: ${frontendDist}`);

  Bun.serve({
    port: Number(config.port),
    fetch: app.fetch,
  });

  logger.info(`Server running on http://localhost:${config.port}`);
}

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
