import { generateText } from 'ai';
import { hashStrings, getCached, setCache } from './cache.js';

export interface TranslateOptions {
  model: Parameters<typeof generateText>[0]['model'];
  sourceStrings: Record<string, string | PluralSource>;
  targetLocale: string;
}

export interface PluralSource {
  _plural: true;
  count_var: string;
  forms: { one?: string; other: string };
}

function getPluralCategories(locale: string): string[] {
  const pr = new Intl.PluralRules(locale);
  const cats = new Set<string>();
  for (const n of [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 10, 11, 12, 19, 20, 21, 22, 100, 101, 102]) {
    cats.add(pr.select(n));
  }
  return [...cats].sort();
}

const TRANSLATE_SYSTEM_PROMPT = `You are a professional UI translator. You translate application interface strings from English to other languages.

Rules:
- Preserve all {placeholder} variables exactly as they are
- Preserve the meaning and tone
- Keep translations concise and natural for UI context
- Do not translate brand names, technical terms, or placeholder variables
- For plural strings: provide grammatically correct forms for each requested plural category
- Use proper grammar for each plural form (e.g. Arabic dual, Slavic genitive plural, etc.)

Response format: respond with ONLY a JSON block, no other text.`;

export async function translateStrings({
  model,
  sourceStrings,
  targetLocale,
}: TranslateOptions): Promise<Record<string, any>> {
  const keys = Object.keys(sourceStrings);
  if (keys.length === 0) return {};

  const hash = hashStrings(sourceStrings as any);
  const cached = getCached(targetLocale, hash);
  if (cached) {
    console.log(`[translate] ${targetLocale} (cached, ${keys.length} keys)`);
    return cached;
  }

  console.log(`[translate] ${targetLocale} → calling LLM for ${keys.length} keys...`);
  const start = Date.now();

  const categories = getPluralCategories(targetLocale);

  // Build the prompt with clear instructions per key type
  const entries: string[] = [];
  for (const [key, value] of Object.entries(sourceStrings)) {
    if (typeof value === 'string') {
      entries.push(`  "${key}": "${value}"`);
    } else {
      entries.push(`  "${key}": { "_plural": true, "forms": ${JSON.stringify(value.forms)} }  // Provide forms for: ${categories.join(', ')}`);
    }
  }

  const prompt = `Translate from English to ${targetLocale}.

Plural categories needed for ${targetLocale}: ${categories.join(', ')}

Source:
{
${entries.join('\n')}
}

For regular strings: return "key": "translated string"
For plural strings (marked _plural): return "key": { ${categories.map(c => `"${c}": "..."`).join(', ')} }
Use proper ${targetLocale} grammar for each plural form.`;

  const { text, usage } = await generateText({
    model,
    messages: [
      {
        role: 'system',
        content: TRANSLATE_SYSTEM_PROMPT,
        providerOptions: {
          anthropic: { cacheControl: { type: 'ephemeral' } },
        },
      },
      { role: 'user', content: prompt },
    ],
  });

  const elapsed = Date.now() - start;
  console.log(`[translate] ${targetLocale} → done, ${elapsed}ms, ${usage?.totalTokens ?? '?'} tokens`);

  const translations = parseTranslationResponse(text);
  setCache(targetLocale, hash, translations);

  return translations;
}

function parseTranslationResponse(text: string): Record<string, any> {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[1].trim()); } catch {}
  }
  try { return JSON.parse(text); } catch {}
  return {};
}
