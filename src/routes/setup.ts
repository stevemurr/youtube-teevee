import { Hono } from 'hono';
import { $ } from 'bun';
import fs from 'fs/promises';
import { config } from '../config';
import { getDb } from '../services/database';
import { ok, fail } from '../utils/response';
import { logger } from '../utils/logger';
import type { HonoEnv } from '../types';

const router = new Hono<HonoEnv>();

const BROWSER_ARGS: Record<string, string> = {
  chrome:   'chrome',
  firefox:  'firefox',
  safari:   'safari',
  edge:     'edge',
  brave:    'brave',
  chromium: 'chromium',
  vivaldi:  'vivaldi',
  atlas:    `chrome:${process.env.HOME}/Library/Application Support/com.openai.atlas/browser-data/host`,
};

router.post('/browser', async (c) => {
  const { browser = 'chrome' } = await c.req.json().catch(() => ({ browser: 'chrome' }));

  const browserArg = BROWSER_ARGS[browser];
  if (!browserArg) {
    return fail(c, 400, `Unknown browser "${browser}". Supported: ${Object.keys(BROWSER_ARGS).join(', ')}`);
  }

  let ytdlpOk = false;
  try {
    const v = await $`yt-dlp --version`.quiet().nothrow();
    ytdlpOk = v.exitCode === 0;
  } catch {
    ytdlpOk = false;
  }
  if (!ytdlpOk) {
    return fail(c, 500, `yt-dlp not found. Server PATH: ${process.env.PATH ?? '(empty)'}\n\nInstall: brew install yt-dlp`);
  }

  logger.log(`[Setup] Running yt-dlp --cookies-from-browser ${browser} ...`);

  const result = await $`yt-dlp --cookies-from-browser ${browserArg} --cookies ${config.cookiesPath} --flat-playlist --print channel_id --print channel --print thumbnail -q https://www.youtube.com/feed/channels`
    .quiet()
    .nothrow();

  const stdout = result.stdout.toString().trim();
  const stderr = result.stderr.toString().trim();

  logger.log(`[Setup] exit=${result.exitCode} stdout_bytes=${stdout.length} stderr_bytes=${stderr.length}`);
  if (stderr) logger.error(`[Setup] yt-dlp stderr:\n${stderr}`);

  if (!stdout) {
    const detail = stderr || `exit code ${result.exitCode} — no output`;
    return fail(c, 422, `yt-dlp returned no data.\n\n${detail}`);
  }

  const lines = stdout.split('\n');
  const channels: Array<{ id: string; name: string; thumbnail: string }> = [];
  const seen = new Set<string>();

  for (let i = 0; i + 2 < lines.length; i += 3) {
    const id        = lines[i].trim();
    const name      = lines[i + 1].trim();
    let   thumbnail = lines[i + 2].trim();

    if (id && name && id.startsWith('UC') && !seen.has(id)) {
      seen.add(id);
      if (thumbnail.startsWith('//')) thumbnail = 'https:' + thumbnail;
      if (thumbnail === 'NA') thumbnail = '';
      channels.push({ id, name, thumbnail });
    }
  }

  if (channels.length === 0) {
    return fail(c, 422, `yt-dlp ran but found no subscriptions. Are you signed into YouTube in ${browser}?\n\nOutput sample:\n${stdout.slice(0, 300)}`);
  }

  await fs.writeFile(config.subscriptionsPath, JSON.stringify(channels));
  logger.log(`[Setup] Saved ${channels.length} channels`);

  const db = getDb();
  db.query(`INSERT OR IGNORE INTO users (youtube_user_id, name, settings) VALUES (?, ?, ?)`)
    .run('local-user', 'Local User', '{}');

  return ok(c, {
    channelCount: channels.length,
    message: `Found ${channels.length} channels.`,
  });
});

export default router;
