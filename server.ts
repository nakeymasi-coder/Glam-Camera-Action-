import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import { access } from 'node:fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDriveBackupRouter } from './server/driveBackup.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT === undefined || process.env.PORT === '' ? 3000 : Number(process.env.PORT);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT must be an integer from 1 to 65535.');

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  if (process.env.NODE_ENV === 'production') await access(path.resolve(__dirname, 'dist', 'index.html'));
  app.get('/healthz', (_req: Request, res: Response) => res.status(200).json({ status: 'ok' }));

  // Optional private Drive backup is fail-closed until secure server configuration.
  app.use('/api/drive', await createDriveBackupRouter());

  // Unknown/removed APIs must never fall through to the SPA success response.
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint is not available in this local planner.' });
  });

  // Planning is browser-local. No AI provider clients, credentials or paid endpoints.
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { server } },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Glam, Camera, Action! local planning studio at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
