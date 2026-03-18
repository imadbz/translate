import type { Plugin } from 'vite';
import { resolve } from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { resolveOptions, type PluginOptions } from './options.js';
import { collectFiles } from './collector.js';
import { upload, pollJob, type JobResponse } from './client.js';

export default function translatePlugin(options: PluginOptions): Plugin {
  const opts = resolveOptions(options);
  let projectRoot: string;
  const transformedFiles = new Map<string, string>();

  return {
    name: 'vite-plugin-translate',
    enforce: 'pre',

    configResolved(config) {
      projectRoot = config.root;
    },

    async buildStart() {
      transformedFiles.clear();

      // 1. Collect source files
      const files = await collectFiles(projectRoot, opts.include, opts.exclude);

      if (files.length === 0) {
        console.warn('[translate] No files matched the include patterns');
        return;
      }

      // 2. Read existing translations from disk (if any)
      let translations: Record<string, string> | undefined;
      const localeFile = resolve(projectRoot, opts.translationsDir, `${opts.locale}.json`);
      try {
        const content = await readFile(localeFile, 'utf-8');
        translations = JSON.parse(content);
      } catch {
        // No translations file yet — that's fine
      }

      // 3. Upload to server
      const { jobId } = await upload(opts.serverUrl, {
        locale: opts.locale,
        files,
        translations,
      });

      // 4. Poll for results
      const result: JobResponse = await pollJob(opts.serverUrl, jobId, {
        interval: opts.pollInterval,
        timeout: opts.pollTimeout,
      });

      // 5. Store transformed files for the transform hook
      if (result.files) {
        for (const file of result.files) {
          const absolutePath = resolve(projectRoot, file.path);
          transformedFiles.set(absolutePath, file.content);
        }
      }

      // 6. Write extracted translations to disk
      if (result.translations) {
        const translationsDir = resolve(projectRoot, opts.translationsDir);
        await mkdir(translationsDir, { recursive: true });
        const outPath = resolve(translationsDir, 'en.json');
        const sorted = Object.keys(result.translations).sort().reduce((acc, key) => {
          acc[key] = result.translations![key];
          return acc;
        }, {} as Record<string, string>);
        await writeFile(outPath, JSON.stringify(sorted, null, 2) + '\n');

        console.log(
          `[translate] Processed ${files.length} files, extracted ${Object.keys(sorted).length} strings → ${opts.translationsDir}/en.json`,
        );
      }
    },

    transform(code, id) {
      const transformed = transformedFiles.get(id);
      if (transformed && transformed !== code) {
        return { code: transformed, map: null };
      }
      return null;
    },
  };
}
