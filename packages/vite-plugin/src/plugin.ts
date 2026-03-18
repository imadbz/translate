import type { Plugin } from 'vite';
import { resolve } from 'path';
import { resolveOptions, type PluginOptions } from './options.js';
import { collectFiles } from './collector.js';
import { upload, pollJob, type JobResponse } from './client.js';

export default function translatePlugin(options: PluginOptions): Plugin {
  const opts = resolveOptions(options);
  let projectRoot: string;
  const transformedFiles = new Map<string, string>();
  let translations: Record<string, string> = {};

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

      // 2. Upload to server
      const { jobId } = await upload(opts.serverUrl, {
        locale: opts.locale,
        files,
        translations: opts.translations,
      });

      // 3. Poll for results
      const result: JobResponse = await pollJob(opts.serverUrl, jobId, {
        interval: opts.pollInterval,
        timeout: opts.pollTimeout,
      });

      // 4. Store transformed files for the transform hook
      if (result.files) {
        for (const file of result.files) {
          const absolutePath = resolve(projectRoot, file.path);
          transformedFiles.set(absolutePath, file.content);
        }
      }

      if (result.translations) {
        translations = result.translations;
      }

      console.log(
        `[translate] Processed ${files.length} files, extracted ${Object.keys(translations).length} strings`,
      );
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
