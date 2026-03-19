import { generateText, Output } from 'ai';
import { z } from 'zod';
import { hashStrings, getCached, setCache } from './cache.js';

export interface TranslateOptions {
  model: Parameters<typeof generateText>[0]['model'];
  sourceStrings: Record<string, string>;
  targetLocale: string;
}

const TRANSLATE_SYSTEM_PROMPT = `You are a professional UI translator. You translate application interface strings from English to other languages.

Rules:
- Preserve all {placeholder} variables exactly as they are
- Preserve the meaning and tone
- Keep translations concise and natural for UI context
- Do not translate brand names, technical terms, or placeholder variables
- Return translations as a JSON object with the same keys as the input`;

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
  if (cached) {
    console.log(`[translate] ${targetLocale} (cached, ${keys.length} keys)`);
    return cached;
  }

  console.log(`[translate] ${targetLocale} → calling LLM for ${keys.length} keys...`);
  const start = Date.now();

  // Build a schema that matches the exact keys
  const schemaShape: Record<string, z.ZodString> = {};
  for (const key of keys) {
    schemaShape[key] = z.string();
  }

  const entries = Object.entries(sourceStrings)
    .map(([key, value]) => `  "${key}": "${value}"`)
    .join('\n');

  const { output, usage, providerMetadata } = await generateText({
    model,
    output: Output.object({
      schema: z.object(schemaShape),
    }),
    messages: [
      {
        role: 'system',
        content: TRANSLATE_SYSTEM_PROMPT,
        providerOptions: {
          anthropic: { cacheControl: { type: 'ephemeral' } },
        },
      },
      {
        role: 'user',
        content: `Translate the following UI strings from English to ${targetLocale}.\n\nSource strings (English):\n{\n${entries}\n}`,
      },
    ],
  });

  const elapsed = Date.now() - start;
  const translations = (output ?? {}) as Record<string, string>;
  const cacheInfo = (providerMetadata as any)?.anthropic?.cacheReadInputTokens
    ? ` (cache hit: ${(providerMetadata as any).anthropic.cacheReadInputTokens} tokens)`
    : '';
  console.log(`[translate] ${targetLocale} → done, ${elapsed}ms, ${usage?.totalTokens ?? '?'} tokens${cacheInfo}`);

  // Cache the result
  setCache(targetLocale, hash, translations);

  return translations;
}
