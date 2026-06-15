import { Response } from 'express';

interface SseClient {
  userId: string;
  role: string;
  res: Response;
}

const clients: SseClient[] = [];

export function addSseClient(userId: string, role: string, res: Response): () => void {
  const client: SseClient = { userId, role, res };
  clients.push(client);
  return () => {
    const idx = clients.indexOf(client);
    if (idx !== -1) clients.splice(idx, 1);
  };
}

export function broadcastToRoles(roles: string[], event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    if (roles.includes(client.role)) {
      try {
        client.res.write(payload);
      } catch {
        // client disconnected — removed via req.on('close')
      }
    }
  }
}
