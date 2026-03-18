import { describe, it, expect } from 'vitest';
import { emitTCalls } from '@translate/server/transform/emitter';
import { KeyRegistry } from '@translate/server/transform/keygen';

function emit(code: string, filePath = 'src/Component.tsx') {
  const registry = new KeyRegistry();
  return emitTCalls(code, filePath, (fp, val) => registry.register(fp, val));
}

describe('emitTCalls', () => {
  describe('JSXText', () => {
    it('replaces text with t() call', () => {
      const result = emit('<h1>Hello World</h1>');
      expect(result).toContain('__t(');
      expect(result).toContain('"component.hello_world"');
      expect(result).not.toContain('>Hello World<');
    });

    it('wraps t() call in JSX expression container', () => {
      const result = emit('<h1>Hello World</h1>');
      expect(result).toMatch(/\{__t\(/);
    });

    it('does not touch whitespace-only text', () => {
      const result = emit('<div>   </div>');
      expect(result).not.toContain('__t(');
    });
  });

  describe('JSX attributes', () => {
    it('replaces translatable attribute with t() call', () => {
      const result = emit('<input placeholder="Enter email" />');
      expect(result).toContain('__t(');
      expect(result).toContain('"component.enter_email"');
    });

    it('does NOT replace className', () => {
      const result = emit('<div className="flex">Hello</div>');
      expect(result).toContain('"flex"');
    });
  });

  describe('template literals', () => {
    it('replaces template literal with t() call and params', () => {
      const code = 'const x = <p>{`Hello ${name}`}</p>';
      const result = emit(code);
      expect(result).toContain('__t(');
      expect(result).toContain('"component.hello_name"');
      expect(result).toContain('name');
    });

    it('passes interpolation variables as second arg', () => {
      const code = 'const x = <p>{`Hello ${name}`}</p>';
      const result = emit(code);
      // Should have t('key', { name })
      expect(result).toMatch(/__t\("[^"]+",\s*\{/);
    });
  });

  describe('import injection', () => {
    it('adds useTranslation import when translations exist', () => {
      const result = emit('<p>Hello</p>');
      expect(result).toContain('import { useTranslation as __useT } from "@translate/react"');
    });

    it('does NOT add import when no translations', () => {
      const result = emit('<div className="flex"></div>');
      expect(result).not.toContain('@translate/react');
    });
  });

  describe('hook injection', () => {
    it('injects useTranslation hook into function components', () => {
      const code = `
        function MyComponent() {
          return <h1>Hello</h1>;
        }
      `;
      const result = emit(code);
      expect(result).toContain('const __t = __useT()');
    });

    it('injects hook into arrow function components', () => {
      const code = `
        const MyComponent = () => <h1>Hello</h1>;
      `;
      const result = emit(code);
      expect(result).toContain('const __t = __useT()');
    });

    it('injects hook into arrow function with block body', () => {
      const code = `
        const MyComponent = () => {
          return <h1>Hello</h1>;
        };
      `;
      const result = emit(code);
      expect(result).toContain('const __t = __useT()');
    });

    it('does NOT inject hook into functions without translatable strings', () => {
      const code = `
        function helper() {
          return 42;
        }
        function MyComponent() {
          return <h1>Hello</h1>;
        }
      `;
      const result = emit(code);
      // helper should not have the hook
      const helperMatch = result.match(/function helper\(\)\s*\{([^}]*)\}/);
      expect(helperMatch?.[1]).not.toContain('__useT');
    });
  });

  describe('preserves non-translatable content', () => {
    it('preserves console.log strings', () => {
      const code = `
        console.log('debug');
        const x = <p>Hello</p>;
      `;
      const result = emit(code);
      expect(result).toContain("'debug'");
    });

    it('preserves import strings', () => {
      const code = `
        import React from 'react';
        const x = <p>Hello</p>;
      `;
      const result = emit(code);
      expect(result).toContain("from 'react'");
    });
  });
});
