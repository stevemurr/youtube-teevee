type Level = 'debug' | 'info' | 'warn' | 'error';

const RANK: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const minLevel: Level = (process.env.LOG_LEVEL as Level | undefined) ?? 'info';

function log(level: Level, ...args: unknown[]): void {
  if (RANK[level] < RANK[minLevel]) return;
  const ts = new Date().toISOString();
  const label = level.toUpperCase().padEnd(5);
  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  out(`${ts} ${label}`, ...args);
}

export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info:  (...args: unknown[]) => log('info',  ...args),
  warn:  (...args: unknown[]) => log('warn',  ...args),
  error: (...args: unknown[]) => log('error', ...args),
};
