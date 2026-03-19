import { createUnplugin } from 'unplugin';
import { resolve, basename } from 'path';
import { mkdir, readdir, writeFile } from 'fs/promises';
import { resolveOptions, type PluginOptions } from './options.js';
import { collectFiles } from './collector.js';
import { upload, pollJob, type JobResponse } from './client.js';

const VIRTUAL_MODULE_ID = 'virtual:translate-translations';
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_MODULE_ID;

export const unplugin = createUnplugin((options: PluginOptions) => {
  const opts = resolveOptions(options);
  let projectRoot: string;
  let isServe = false;
  const transformedFiles = new Map<string, string>();

  return {
    name: 'translate',
    enforce: 'pre',

    vite: {
      configResolved(config) {
        projectRoot = config.root;
        isServe = config.command === 'serve';
      },
    },

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_ID;
    },

    async loadInclude(id) {
      return id === RESOLVED_VIRTUAL_ID;
    },

    async load(id) {
      if (id !== RESOLVED_VIRTUAL_ID) return;

      // Always try to load translations from disk (works for both dev and build)
      const translationsDir = resolve(projectRoot, opts.translationsDir);
      let files: string[];
      try {
        files = (await readdir(translationsDir)).filter(f => f.endsWith('.json')).sort();
      } catch {
        return 'export default {};';
      }

      const imports: string[] = [];
      const entries: string[] = [];

      for (const file of files) {
        const locale = basename(file, '.json');
        const varName = `__locale_${locale.replace(/[^a-zA-Z0-9]/g, '_')}`;
        imports.push(`import ${varName} from ${JSON.stringify(resolve(translationsDir, file))};`);
        entries.push(`${JSON.stringify(locale)}: ${varName}`);
      }

      return `${imports.join('\n')}\nexport default { ${entries.join(', ')} };`;
    },

    async buildStart() {
      if (!projectRoot) projectRoot = process.cwd();

      // In dev mode, skip server calls unless explicitly enabled
      if (isServe && !opts.translateInDev) {
        console.log('[translate] Dev mode — skipping server, using translations from disk');
        return;
      }

      transformedFiles.clear();

      const files = await collectFiles(projectRoot, opts.include, opts.exclude);

      if (files.length === 0) {
        console.warn('[translate] No files matched the include patterns');
        return;
      }

      const { jobId } = await upload(opts.serverUrl, {
        files,
        projectId: opts.projectId,
      });

      const result: JobResponse = await pollJob(opts.serverUrl, jobId, {
        interval: opts.pollInterval,
        timeout: opts.pollTimeout,
      });

      if (result.files) {
        for (const file of result.files) {
          const absolutePath = resolve(projectRoot, file.path);
          transformedFiles.set(absolutePath, file.content);
        }
      }

      if (result.translations) {
        const translationsDir = resolve(projectRoot, opts.translationsDir);
        await mkdir(translationsDir, { recursive: true });

        const locales = Object.keys(result.translations);
        for (const locale of locales) {
          const data = result.translations[locale];
          const sorted = Object.keys(data).sort().reduce((acc, key) => {
            acc[key] = data[key];
            return acc;
          }, {} as Record<string, string>);
          const outPath = resolve(translationsDir, `${locale}.json`);
          await writeFile(outPath, JSON.stringify(sorted, null, 2) + '\n');
        }

        const enKeys = Object.keys(result.translations['en'] ?? {});
        console.log(
          `[translate] Processed ${files.length} files, extracted ${enKeys.length} strings, ${locales.length} locales → ${opts.translationsDir}/`,
        );
      }
    },

    transformInclude(id) {
      return /\.(tsx|jsx)$/.test(id);
    },

    transform(code, id) {
      // In dev mode (no server), don't transform files — serve originals
      if (isServe && !opts.translateInDev) {
        // Still wrap the entry with provider + dev warning
        if (/createRoot|ReactDOM\.render/.test(code)) {
          return { code: wrapEntryWithProvider(code, true), map: null };
        }
        return null;
      }

      // Use server-transformed code if available
      let currentCode = code;
      const transformed = transformedFiles.get(id);
      if (transformed && transformed !== code) {
        currentCode = transformed;
      }

      // Auto-inject TranslateProvider into entry files (check both original and transformed)
      if (/createRoot|ReactDOM\.render/.test(currentCode)) {
        return { code: wrapEntryWithProvider(currentCode), map: null };
      }

      if (currentCode !== code) {
        return { code: currentCode, map: null };
      }

      return null;
    },
  };
});

function wrapEntryWithProvider(code: string, devMode = false): string {
  const imports = [
    `import __translations from "${VIRTUAL_MODULE_ID}";`,
    `import { TranslateProvider as __TranslateProvider } from "@translate/react";`,
  ].join('\n');

  const devWarning = devMode
    ? `console.warn("[translate] Translations are disabled in dev mode. Run 'vite build' to generate translations, or set translateInDev: true in plugin options.");`
    : '';

  const wrapped = code.replace(
    /\.render\(\s*(<[\s\S]*?>[\s\S]*?)\s*\)/,
    (_match, jsx) => `.render(<__TranslateProvider translations={__translations}>${jsx}</__TranslateProvider>)`,
  );

  return imports + '\n' + devWarning + '\n' + wrapped;
}

// Default export for Vite (backwards compatible)
export default unplugin.vite;
