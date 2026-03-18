import { unplugin } from './plugin.js';

export { unplugin } from './plugin.js';
export type { PluginOptions } from './options.js';

// Default export: Vite plugin (backwards compatible)
export default unplugin.vite;

// Bundler-specific exports
export const vite = unplugin.vite;
export const webpack = unplugin.webpack;
export const rollup = unplugin.rollup;
export const esbuild = unplugin.esbuild;
export const rspack = unplugin.rspack;
export const rolldown = unplugin.rolldown;
export const farm = unplugin.farm;
