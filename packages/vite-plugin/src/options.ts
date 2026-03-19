export interface PluginOptions {
  /** Server URL (required) */
  serverUrl: string;
  /** Project ID — the server uses this to determine enabled locales */
  projectId?: string;
  /** Directory to write translation JSON files (default: "translations") */
  translationsDir?: string;
  /** File globs to include (default: ["src/**\/*.{tsx,jsx}"]) */
  include?: string[];
  /** File globs to exclude (default: ["**\/*.test.*", "**\/*.spec.*"]) */
  exclude?: string[];
  /** Milliseconds between poll requests (default: 500) */
  pollInterval?: number;
  /** Milliseconds before poll timeout (default: 60000) */
  pollTimeout?: number;
}

export interface ResolvedOptions {
  serverUrl: string;
  projectId?: string;
  translationsDir: string;
  include: string[];
  exclude: string[];
  pollInterval: number;
  pollTimeout: number;
}

export function resolveOptions(options: PluginOptions): ResolvedOptions {
  return {
    serverUrl: options.serverUrl.replace(/\/$/, ''),
    projectId: options.projectId,
    translationsDir: options.translationsDir ?? 'translations',
    include: options.include ?? ['src/**/*.{tsx,jsx}'],
    exclude: options.exclude ?? ['**/*.test.*', '**/*.spec.*'],
    pollInterval: options.pollInterval ?? 500,
    pollTimeout: options.pollTimeout ?? 180000,
  };
}
