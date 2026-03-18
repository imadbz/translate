import { extractStrings } from './extract/extractor.js';
import { emitTCalls } from './transform/emitter.js';
import { KeyRegistry } from './transform/keygen.js';
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
  /** All locale translations keyed by locale: { en: {...}, fr: {...} } */
  translations: Record<string, Record<string, string>>;
}

export interface Job {
  id: string;
  status: 'processing' | 'complete' | 'error';
  files: FileInput[];
  result?: JobResult;
  error?: string;
}

/**
 * Process source files: extract strings, emit t() calls, return all locale translations.
 * @param files - source files to process
 * @param localeTranslations - existing translations per locale (from project config/db)
 */
export function processFiles(
  files: FileInput[],
  localeTranslations?: Record<string, Record<string, string>>,
): JobResult {
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

  // Build the full locale map: en is always included, plus any configured locales
  const allTranslations: Record<string, Record<string, string>> = {
    en: sourceTranslations,
    ...localeTranslations,
  };

  return {
    files: outputFiles,
    translations: allTranslations,
  };
}
