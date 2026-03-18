import { extractStrings } from './extract/extractor.js';
import { emitTCalls } from './transform/emitter.js';
import { KeyRegistry } from './transform/keygen.js';
import { translateStrings } from './translate/llm.js';
import type { ExtractedString } from './extract/visitors.js';

export interface FileInput {
  path: string;
  content: string;
}

export interface FileOutput {
  path: string;
  content: string;
}

export interface JobResult {
  files: FileOutput[];
  translations: Record<string, Record<string, string>>;
}

export interface Job {
  id: string;
  status: 'processing' | 'complete' | 'error';
  files: FileInput[];
  result?: JobResult;
  error?: string;
}

export interface ProcessOptions {
  model: Parameters<typeof translateStrings>[0]['model'];
  locales: string[];
}

export async function processFiles(
  files: FileInput[],
  options?: ProcessOptions,
): Promise<JobResult> {
  const keyRegistry = new KeyRegistry();
  const keyGen = (filePath: string, value: string) => keyRegistry.register(filePath, value);

  // Phase A: Extract all strings from all files
  const allExtracted: ExtractedString[] = [];
  for (const file of files) {
    const extracted = extractStrings(file.content, file.path, keyGen);
    allExtracted.push(...extracted);
  }

  // Build the source translations map (en.json)
  const sourceTranslations: Record<string, string> = {};
  for (const entry of allExtracted) {
    sourceTranslations[entry.key] = entry.value;
  }

  // Phase B: Emit t() calls into source files
  const emitRegistry = new KeyRegistry();
  const emitKeyGen = (filePath: string, value: string) => emitRegistry.register(filePath, value);

  const outputFiles: FileOutput[] = [];
  for (const file of files) {
    const transformed = emitTCalls(file.content, file.path, emitKeyGen);
    outputFiles.push({ path: file.path, content: transformed });
  }

  // Phase C: Translate to all configured locales via LLM
  const allTranslations: Record<string, Record<string, string>> = {
    en: sourceTranslations,
  };

  if (options && Object.keys(sourceTranslations).length > 0) {
    const translationPromises = options.locales
      .filter(l => l !== 'en')
      .map(async (locale) => {
        const translated = await translateStrings({
          model: options.model,
          sourceStrings: sourceTranslations,
          targetLocale: locale,
        });
        return [locale, translated] as const;
      });

    const results = await Promise.all(translationPromises);
    for (const [locale, translated] of results) {
      allTranslations[locale] = translated;
    }
  }

  return {
    files: outputFiles,
    translations: allTranslations,
  };
}
