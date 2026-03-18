import type { Plugin } from 'vite';
import { resolve, basename } from 'path';
import { mkdir, readdir, readFile, writeFile } from 'fs/promises';
import { resolveOptions, type PluginOptions } from './options.js';
import { collectFiles } from './collector.js';
import { upload, pollJob, type JobResponse } from './client.js';

const VIRTUAL_MODULE_ID = 'virtual:translate-translations';
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_MODULE_ID;

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

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_ID;
    },

    async load(id) {
      if (id !== RESOLVED_VIRTUAL_ID) return;

      // Read all JSON files from the translations directory and export them
      const translationsDir = resolve(projectRoot, opts.translationsDir);
      let files: string[];
      try {
        files = await readdir(translationsDir);
      } catch {
        return 'export default {};';
      }

      const jsonFiles = files.filter(f => f.endsWith('.json')).sort();
      const imports: string[] = [];
      const entries: string[] = [];

      for (const file of jsonFiles) {
        const locale = basename(file, '.json');
        const varName = `__locale_${locale.replace(/[^a-zA-Z0-9]/g, '_')}`;
        imports.push(`import ${varName} from ${JSON.stringify(resolve(translationsDir, file))};`);
        entries.push(`${JSON.stringify(locale)}: ${varName}`);
      }

      return `${imports.join('\n')}\nexport default { ${entries.join(', ')} };`;
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
      const { jobId } = await upload(opts.serverUrl, { files });

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

      // 5. Write extracted translations to disk
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
      // Serve transformed files from server
      const transformed = transformedFiles.get(id);
      if (transformed && transformed !== code) {
        return { code: transformed, map: null };
      }

      // Auto-inject TranslateProvider into entry files that call createRoot/render
      if (/\.(tsx|jsx)$/.test(id) && /createRoot|ReactDOM\.render/.test(code)) {
        return { code: wrapEntryWithProvider(code), map: null };
      }

      return null;
    },
  };
}

function wrapEntryWithProvider(code: string): string {
  const imports = [
    `import __translations from "${VIRTUAL_MODULE_ID}";`,
    `import { TranslateProvider as __TranslateProvider } from "@translate/react";`,
  ].join('\n');

  // Wrap JSX inside createRoot(...).render(<X />) with <TranslateProvider>
  // Handles: .render(<App />) and .render(<StrictMode><App /></StrictMode>)
  const wrapped = code.replace(
    /\.render\(\s*(<[\s\S]*?>[\s\S]*?)\s*\)/,
    (match, jsx) => `.render(<__TranslateProvider translations={__translations}>${jsx}</__TranslateProvider>)`,
  );

  return imports + '\n' + wrapped;
}
