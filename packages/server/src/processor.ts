import { extractStrings } from './extract/extractor.js';
import { inlineTranslations, type TranslationMap } from './transform/inliner.js';
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
  translations: Record<string, string>;
}

export interface Job {
  id: string;
  status: 'processing' | 'complete' | 'error';
  locale: string;
  files: FileInput[];
  result?: JobResult;
  error?: string;
}

export function processFiles(
  files: FileInput[],
  locale: string,
  existingTranslations?: TranslationMap,
): JobResult {
  const keyRegistry = new KeyRegistry();
  const keyGen = (filePath: string, value: string) => keyRegistry.register(filePath, value);

  // Phase A: Extract all strings from all files
  const allExtracted: ExtractedString[] = [];
  for (const file of files) {
    const extracted = extractStrings(file.content, file.path, keyGen);
    allExtracted.push(...extracted);
  }

  // Build the source translations map (en.json equivalent)
  const sourceTranslations: Record<string, string> = {};
  for (const entry of allExtracted) {
    sourceTranslations[entry.key] = entry.value;
  }

  // Phase B: If not source locale, inline translations
  const isSourceLocale = locale === 'en';
  const outputFiles: FileOutput[] = [];

  if (isSourceLocale) {
    // Identity transform — return files unchanged
    for (const file of files) {
      outputFiles.push({ path: file.path, content: file.content });
    }
  } else {
    // Use provided translations, falling back to source text
    const mergedTranslations: TranslationMap = { ...sourceTranslations };
    if (existingTranslations) {
      for (const [key, value] of Object.entries(existingTranslations)) {
        mergedTranslations[key] = value;
      }
    }

    // Reset the key registry for inlining pass (same keys must be generated)
    const inlineRegistry = new KeyRegistry();
    const inlineKeyGen = (filePath: string, value: string) => inlineRegistry.register(filePath, value);

    for (const file of files) {
      const transformed = inlineTranslations(
        file.content,
        file.path,
        mergedTranslations,
        inlineKeyGen,
      );
      outputFiles.push({ path: file.path, content: transformed });
    }
  }

  return {
    files: outputFiles,
    translations: sourceTranslations,
  };
}
