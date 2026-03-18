import { createHash } from 'crypto';

interface CacheEntry {
  translations: Record<string, string>;
  hash: string;
}

// In-memory cache keyed by `${locale}:${hash}`
const cache = new Map<string, CacheEntry>();

export function hashStrings(strings: Record<string, string>): string {
  const sorted = Object.keys(strings).sort().map(k => `${k}=${strings[k]}`).join('\n');
  return createHash('sha256').update(sorted).digest('hex').slice(0, 16);
}

export function getCached(locale: string, hash: string): Record<string, string> | undefined {
  const entry = cache.get(`${locale}:${hash}`);
  if (entry && entry.hash === hash) return entry.translations;
  return undefined;
}

export function setCache(locale: string, hash: string, translations: Record<string, string>): void {
  cache.set(`${locale}:${hash}`, { translations, hash });
}

export function clearCache(): void {
  cache.clear();
}
