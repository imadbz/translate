import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { extractStrings } from '@translate/server/extract/extractor';
import { inlineTranslations } from '@translate/server/transform/inliner';
import { KeyRegistry } from '@translate/server/transform/keygen';

const edgeCasesDir = resolve(__dirname, '../../fixtures/edge-cases');

function extract(filePath: string) {
  const content = readFileSync(resolve(edgeCasesDir, filePath), 'utf-8');
  const registry = new KeyRegistry();
  return {
    extracted: extractStrings(content, `src/${filePath}`, (fp, val) => registry.register(fp, val)),
    content,
  };
}

function inline(filePath: string, translations: Record<string, string>) {
  const content = readFileSync(resolve(edgeCasesDir, filePath), 'utf-8');
  const registry = new KeyRegistry();
  return inlineTranslations(content, `src/${filePath}`, translations, (fp, val) => registry.register(fp, val));
}

describe('edge cases', () => {
  describe('CssClasses.tsx', () => {
    it('extracts only visible text, NOT class names', () => {
      const { extracted } = extract('CssClasses.tsx');
      const values = extracted.map(e => e.value);

      // Should extract visible text
      expect(values).toContain('Dashboard');
      expect(values).toContain('Save changes');

      // Should NOT extract any CSS/Tailwind classes
      expect(values).not.toContain('flex items-center justify-between p-4');
      expect(values).not.toContain('text-lg font-bold text-gray-900');
      expect(values).not.toContain('bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded');
    });

    it('translates text while preserving class names', () => {
      const result = inline('CssClasses.tsx', {
        'css_classes.dashboard': 'Tableau de bord',
        'css_classes.save_changes': 'Enregistrer les modifications',
      });

      expect(result).toContain('Tableau de bord');
      expect(result).toContain('Enregistrer les modifications');
      expect(result).toContain('flex items-center justify-between p-4');
      expect(result).toContain('bg-blue-500 hover:bg-blue-700');
    });
  });

  describe('ConsoleLog.tsx', () => {
    it('extracts only visible text, NOT console.log strings', () => {
      const { extracted } = extract('ConsoleLog.tsx');
      const values = extracted.map(e => e.value);

      expect(values).toContain('Visible text');
      expect(values).not.toContain('Component rendered');
      expect(values).not.toContain('Deprecation warning');
      expect(values).not.toContain('Something went wrong');
    });

    it('translates visible text while preserving console strings', () => {
      const result = inline('ConsoleLog.tsx', {
        'console_log.visible_text': 'Texte visible',
      });

      expect(result).toContain('Texte visible');
      expect(result).toContain("'Component rendered'");
      expect(result).toContain("'Deprecation warning'");
      expect(result).toContain("'Something went wrong'");
    });
  });

  describe('UrlsAndPaths.tsx', () => {
    it('extracts visible text and alt, NOT URLs or paths', () => {
      const { extracted } = extract('UrlsAndPaths.tsx');
      const values = extracted.map(e => e.value);

      // Should extract visible/accessible text
      expect(values).toContain('View API docs');
      expect(values).toContain('Company logo');
      expect(values).toContain('Contact us for more information');

      // Should NOT extract URLs or paths
      expect(values).not.toContain('https://example.com/api/v1/users');
      expect(values).not.toContain('/images/logo.png');
      expect(values).not.toContain('/styles/main.css');
    });

    it('translates text while preserving URLs', () => {
      const result = inline('UrlsAndPaths.tsx', {
        'urls_and_paths.view_api_docs': 'Voir la documentation API',
        'urls_and_paths.company_logo': 'Logo de la société',
        'urls_and_paths.contact_us_for_more_information': 'Contactez-nous pour plus d\'informations',
      });

      expect(result).toContain('Voir la documentation API');
      // Babel may escape unicode in attributes (é → \xE9), so check both forms
      expect(result.includes('Logo de la société') || result.includes('soci\\xE9t\\xE9')).toBe(true);
      expect(result).toContain('https://example.com/api/v1/users');
      expect(result).toContain('/images/logo.png');
    });
  });

  describe('Plurals.tsx', () => {
    it('extracts all translatable strings', () => {
      const { extracted } = extract('Plurals.tsx');
      const values = extracted.map(e => e.value);

      expect(values).toContain('No items found');
    });

    it('extracts template literal with count variable', () => {
      const { extracted } = extract('Plurals.tsx');
      const template = extracted.find(e => e.type === 'template');

      expect(template).toBeDefined();
      expect(template!.value).toContain('{count}');
    });
  });

  describe('TypedComponent.tsx', () => {
    it('extracts text from components with TypeScript generics', () => {
      const { extracted } = extract('TypedComponent.tsx');
      const values = extracted.map(e => e.value);

      expect(values).toContain('Card content');
    });

    it('does not break on generic type parameters', () => {
      // Should not throw during extraction
      const { extracted } = extract('TypedComponent.tsx');
      expect(extracted.length).toBeGreaterThan(0);
    });

    it('translates text in typed components', () => {
      const result = inline('TypedComponent.tsx', {
        'typed_component.card_content': 'Contenu de la carte',
      });

      expect(result).toContain('Contenu de la carte');
      // TypeScript generics should be preserved
      expect(result).toContain('T extends');
    });
  });
});
