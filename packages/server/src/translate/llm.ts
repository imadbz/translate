import { generateObject } from 'ai';
import { z } from 'zod';
import { hashStrings, getCached, setCache } from './cache.js';

export interface TranslateOptions {
  model: Parameters<typeof generateObject>[0]['model'];
  sourceStrings: Record<string, string>;
  targetLocale: string;
}

export async function translateStrings({
  model,
  sourceStrings,
  targetLocale,
}: TranslateOptions): Promise<Record<string, string>> {
  const keys = Object.keys(sourceStrings);
  if (keys.length === 0) return {};

  // Check cache
  const hash = hashStrings(sourceStrings);
  const cached = getCached(targetLocale, hash);
  if (cached) return cached;

  // Build the schema dynamically from the keys
  const schemaShape: Record<string, z.ZodString> = {};
  for (const key of keys) {
    schemaShape[key] = z.string();
  }

  const result = await generateObject({
    model,
    schema: z.object(schemaShape),
    prompt: buildPrompt(sourceStrings, targetLocale),
  });

  const translations = result.object as Record<string, string>;

  // Cache the result
  setCache(targetLocale, hash, translations);

  return translations;
}

function buildPrompt(
  sourceStrings: Record<string, string>,
  targetLocale: string,
): string {
  const entries = Object.entries(sourceStrings)
    .map(([key, value]) => `  "${key}": "${value}"`)
    .join('\n');

  return `Translate the following UI strings from English to ${targetLocale}.

Preserve all {placeholder} variables exactly as they are.
Preserve the meaning and tone. Keep translations concise and natural for UI context.
Do not translate brand names, technical terms, or placeholder variables.

Source strings (English):
{
${entries}
}

Return the translated strings as a JSON object with the same keys.`;
}
