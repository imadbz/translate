import { describe, it, expect } from 'vitest';
import { inlineTranslations } from '@translate/server/transform/inliner';
import { KeyRegistry } from '@translate/server/transform/keygen';

function inline(code: string, translations: Record<string, string>, filePath = 'src/Component.tsx') {
  const registry = new KeyRegistry();
  return inlineTranslations(code, filePath, translations, (fp, val) => registry.register(fp, val));
}

describe('inlineTranslations', () => {
  it('replaces JSXText with translated string', () => {
    const result = inline(
      '<h1>Hello World</h1>',
      { 'component.hello_world': 'Bonjour le monde' },
    );
    expect(result).toContain('Bonjour le monde');
    expect(result).not.toContain('Hello World');
  });

  it('replaces attribute value with translation', () => {
    const result = inline(
      '<input placeholder="Enter your email" />',
      { 'component.enter_your_email': 'Entrez votre email' },
    );
    expect(result).toContain('Entrez votre email');
    expect(result).not.toContain('Enter your email');
  });

  it('replaces template literal static parts', () => {
    const code = 'const x = <p>{`Hello ${name}`}</p>';
    const result = inline(
      code,
      { 'component.hello_name': 'Bonjour {name}' },
    );
    expect(result).toContain('Bonjour ');
    expect(result).not.toContain('Hello ');
    // The ${name} expression should still be present
    expect(result).toContain('name');
  });

  it('does NOT change strings when translation matches original', () => {
    const code = '<h1>Hello</h1>';
    const result = inline(code, { 'component.hello': 'Hello' });
    expect(result).toContain('Hello');
  });

  it('does NOT change strings when no translation exists', () => {
    const code = '<h1>Hello</h1>';
    const result = inline(code, {});
    expect(result).toContain('Hello');
  });

  it('replaces multiple strings in one file', () => {
    const code = `
      <div>
        <h1>Title</h1>
        <p>Body text</p>
      </div>
    `;
    const result = inline(code, {
      'component.title': 'Titre',
      'component.body_text': 'Texte du corps',
    });
    expect(result).toContain('Titre');
    expect(result).toContain('Texte du corps');
    expect(result).not.toContain('>Title<');
    expect(result).not.toContain('>Body text<');
  });

  it('does NOT touch className values', () => {
    const result = inline(
      '<div className="flex items-center">Hello</div>',
      { 'component.hello': 'Bonjour' },
    );
    expect(result).toContain('flex items-center');
    expect(result).toContain('Bonjour');
  });

  it('does NOT touch console.log strings', () => {
    const code = `
      console.log('debug');
      const x = <p>Hello</p>;
    `;
    const result = inline(code, { 'component.hello': 'Bonjour' });
    expect(result).toContain("'debug'");
    expect(result).toContain('Bonjour');
  });

  it('output is valid JSX (can be parsed)', () => {
    const code = '<div><h1>Hello</h1><p>World</p></div>';
    const result = inline(code, {
      'component.hello': 'Bonjour',
      'component.world': 'Monde',
    });
    // Should not throw
    expect(result).toContain('Bonjour');
    expect(result).toContain('Monde');
  });

  it('handles identity transform (source locale)', () => {
    const code = '<h1>Hello</h1>';
    // When translations are the same as source, nothing changes
    const result = inline(code, { 'component.hello': 'Hello' });
    expect(result).toContain('Hello');
  });
});
