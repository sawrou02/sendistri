import { Response } from 'express';
import { addSseClient } from '../sse/notificationHub';
import { AuthenticatedRequest } from '../types';

export function streamNotifications(req: AuthenticatedRequest, res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write(`event: connected\ndata: ${JSON.stringify({ userId: req.user.userId })}\n\n`);

  const remove = addSseClient(req.user.userId, req.user.role, res);
  const ping = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { /* ignore */ }
  }, 25000);

  req.on('close', () => {
    clearInterval(ping);
    remove();
  });
}
