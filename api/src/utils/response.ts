import { Response } from 'express';

export const ok = (res: Response, data?: unknown) =>
  res.json(data ?? { ok: true });

export const fail = (res: Response, status: number, message: string) =>
  res.status(status).json({ error: message });
