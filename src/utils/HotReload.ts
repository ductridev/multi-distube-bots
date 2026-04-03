import { exec } from 'node:child_process';
import fs from 'node:fs';
import { promisify } from 'node:util';
import type Lavamusic from '../structures/Lavamusic';
import Logger from '../structures/Logger';

const execAsync = promisify(exec);
const logger = new Logger('HotReload');

/**
 * Detect if running inside a Docker container.
 */
export function isDockerEnvironment(): boolean {
  // Check common Docker indicators
  if (process.env.DOCKER === '1' || process.env.DOCKER_CONTAINER === '1') return true;
  try {
    // /.dockerenv exists in Docker containers
    if (fs.existsSync('/.dockerenv')) return true;
    // Check cgroup for docker/containerd references
    const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf-8');
    if (cgroup.includes('docker') || cgroup.includes('containerd')) return true;
  } catch {
    // Not on Linux or no access — not Docker
  }
  return false;
}

export interface ReloadResult {
  bot: string;
  commands: { success: boolean; loaded: number; errors: string[] } | null;
  events: { success: boolean; loaded: number; errors: string[] } | null;
  plugins: { success: boolean; loaded: number; errors: string[] } | null;
  services: { success: boolean; reloaded: string[]; errors: string[] } | null;
}

export async function compileTypeScript(): Promise<{ success: boolean; output: string }> {
  if (isDockerEnvironment()) {
    logger.warn('TypeScript compilation skipped — running inside Docker container (no source/compiler available)');
    return { success: true, output: 'Skipped: Docker environment detected. Reloading from existing dist/ files.' };
  }

  try {
    const { stdout, stderr } = await execAsync('npx tsc --project tsconfig.json', {
      cwd: process.cwd(),
      timeout: 60000,
    });
    logger.info('TypeScript compilation successful');
    return { success: true, output: stdout || stderr || 'Build successful' };
  } catch (error: any) {
    logger.error('TypeScript compilation failed:', error.stderr || error.message);
    return { success: false, output: error.stderr || error.message };
  }
}

export async function reloadBot(
  bot: Lavamusic,
  target: 'commands' | 'events' | 'plugins' | 'services' | 'all'
): Promise<ReloadResult> {
  const result: ReloadResult = {
    bot: bot.childEnv.name,
    commands: null,
    events: null,
    plugins: null,
    services: null,
  };

  if (target === 'commands' || target === 'all') {
    result.commands = await bot.reloadCommands();
  }
  if (target === 'events' || target === 'all') {
    result.events = await bot.reloadEvents();
  }
  if (target === 'plugins' || target === 'all') {
    result.plugins = await bot.reloadPlugins();
  }
  if (target === 'services' || target === 'all') {
    result.services = await bot.reloadServices();
  }

  return result;
}
