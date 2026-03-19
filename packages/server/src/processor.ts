import { llmTransformFile } from './transform/llm-transform.js';
import { translateStrings } from './translate/llm.js';

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
  // Phase A: LLM extracts strings and transforms all files in parallel
  const transformResults = await Promise.all(
    files.map(async (file) => {
      if (options) {
        const result = await llmTransformFile(file.content, file.path, { model: options.model });
        return { path: file.path, ...result };
      }
      return { path: file.path, code: file.content, strings: {} as Record<string, string> };
    }),
  );

  // Collect transformed files and merge all extracted strings
  const outputFiles: FileOutput[] = [];
  const sourceTranslations: Record<string, string> = {};

  for (const result of transformResults) {
    outputFiles.push({ path: result.path, content: result.code });
    Object.assign(sourceTranslations, result.strings);
  }

  // Phase B: Translate to all configured locales via LLM (sequential to avoid rate limits on translation)
  const allTranslations: Record<string, Record<string, string>> = {
    en: sourceTranslations,
  };

  if (options && Object.keys(sourceTranslations).length > 0) {
    for (const locale of options.locales.filter(l => l !== 'en')) {
      const translated = await translateStrings({
        model: options.model,
        sourceStrings: sourceTranslations,
        targetLocale: locale,
      });
      allTranslations[locale] = translated;
    }
  }

  return {
    files: outputFiles,
    translations: allTranslations,
  };
}
