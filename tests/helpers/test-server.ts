import { serve } from '@hono/node-server';
import { createRoutes, getModel } from '@translate/server';
import type { Server } from 'http';

let server: ReturnType<typeof serve> | null = null;
let serverPort = 0;

export function getServerUrl(): string {
  return `http://localhost:${serverPort}`;
}

export async function startTestServer(port = 0): Promise<{ url: string; port: number }> {
  const app = createRoutes({ model: getModel() });

  return new Promise((resolve) => {
    server = serve({ fetch: app.fetch, port }, (info) => {
      serverPort = info.port;
      resolve({ url: `http://localhost:${info.port}`, port: info.port });
    });
  });
}

export async function stopTestServer(): Promise<void> {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      (server as Server).close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    server = null;
    serverPort = 0;
  }
}
