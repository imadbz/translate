export interface PluginOptions {
  /** Server URL (required) */
  serverUrl: string;
  /** Target locale for the build (default: "en") */
  locale?: string;
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
  locale: string;
  translationsDir: string;
  include: string[];
  exclude: string[];
  pollInterval: number;
  pollTimeout: number;
}

export function resolveOptions(options: PluginOptions): ResolvedOptions {
  return {
    serverUrl: options.serverUrl.replace(/\/$/, ''),
    locale: options.locale ?? 'en',
    translationsDir: options.translationsDir ?? 'translations',
    include: options.include ?? ['src/**/*.{tsx,jsx}'],
    exclude: options.exclude ?? ['**/*.test.*', '**/*.spec.*'],
    pollInterval: options.pollInterval ?? 500,
    pollTimeout: options.pollTimeout ?? 60000,
  };
}
