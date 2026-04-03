import fs from 'node:fs';
import path from 'node:path';
import { activeBots } from '..';
import { compileTypeScript, reloadBot } from './HotReload';
import Logger from '../structures/Logger';

const logger = new Logger('FileWatcher');
let debounceTimer: NodeJS.Timeout | null = null;

function determineReloadTarget(filePath: string): 'commands' | 'events' | 'plugins' | 'services' | 'all' {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.includes('/commands/')) return 'commands';
  if (normalized.includes('/events/')) return 'events';
  if (normalized.includes('/plugin/')) return 'plugins';
  if (normalized.includes('/services/')) return 'services';
  return 'all';
}

export function startFileWatcher(): void {
  const srcDir = path.join(process.cwd(), 'src');

  let lastTarget: 'commands' | 'events' | 'plugins' | 'services' | 'all' = 'all';

  fs.watch(srcDir, { recursive: true }, (_eventType, filename) => {
    if (!filename || !filename.endsWith('.ts')) return;

    const target = determineReloadTarget(filename);
    lastTarget = lastTarget === 'all' || target === 'all' ? 'all' : target;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const reloadTarget = lastTarget;
      lastTarget = 'all';

      logger.info(`File changed: ${filename}. Recompiling and reloading ${reloadTarget}...`);

      const buildResult = await compileTypeScript();
      if (!buildResult.success) {
        logger.error(`Build failed: ${buildResult.output}`);
        return;
      }

      for (const bot of activeBots) {
        const result = await reloadBot(bot, reloadTarget);
        const status = [
          result.commands?.success !== undefined ? `commands:${result.commands.success ? 'ok' : 'fail'}` : null,
          result.events?.success !== undefined ? `events:${result.events.success ? 'ok' : 'fail'}` : null,
          result.plugins?.success !== undefined ? `plugins:${result.plugins.success ? 'ok' : 'fail'}` : null,
        ].filter(Boolean).join(', ');
        logger.info(`[${result.bot}] ${status}`);
      }

      logger.info('Hot reload complete');
    }, 1500);
  });

  logger.info('File watcher started — watching src/**/*.ts for changes');
}
