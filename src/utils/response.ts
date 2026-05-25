import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

export const ok = (c: Context, data?: unknown) => c.json(data ?? { ok: true });

export const fail = (status: number, message: string): never => {
  throw new HTTPException(status as any, { message });
};
