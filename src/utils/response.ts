import type { Context } from 'hono';

export const ok = (c: Context, data?: unknown) =>
  c.json(data ?? { ok: true });

export const fail = (c: Context, status: number, message: string) =>
  c.json({ error: message }, status as any);
