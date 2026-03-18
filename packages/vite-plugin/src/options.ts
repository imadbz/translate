export interface PluginOptions {
  /** Server URL (required) */
  serverUrl: string;
  /** Target locale for the build (default: "en") */
  locale?: string;
  /** File globs to include (default: ["src/**\/*.{tsx,jsx}"]) */
  include?: string[];
  /** File globs to exclude (default: ["**\/*.test.*", "**\/*.spec.*"]) */
  exclude?: string[];
  /** Milliseconds between poll requests (default: 500) */
  pollInterval?: number;
  /** Milliseconds before poll timeout (default: 60000) */
  pollTimeout?: number;
  /** Pre-loaded translations to send with the upload request */
  translations?: Record<string, string>;
}

export interface ResolvedOptions {
  serverUrl: string;
  locale: string;
  include: string[];
  exclude: string[];
  pollInterval: number;
  pollTimeout: number;
  translations?: Record<string, string>;
}

export function resolveOptions(options: PluginOptions): ResolvedOptions {
  return {
    serverUrl: options.serverUrl.replace(/\/$/, ''),
    locale: options.locale ?? 'en',
    include: options.include ?? ['src/**/*.{tsx,jsx}'],
    exclude: options.exclude ?? ['**/*.test.*', '**/*.spec.*'],
    pollInterval: options.pollInterval ?? 500,
    pollTimeout: options.pollTimeout ?? 60000,
    translations: options.translations,
  };
}
