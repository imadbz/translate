import { describe, it, expect } from 'vitest';
import { extractStrings } from '@translate/server/extract/extractor';
import { KeyRegistry } from '@translate/server/transform/keygen';

function extract(code: string, filePath = 'src/Component.tsx') {
  const registry = new KeyRegistry();
  return extractStrings(code, filePath, (fp, val) => registry.register(fp, val));
}

describe('extractStrings', () => {
  describe('JSXText', () => {
    it('extracts simple text from JSX elements', () => {
      const result = extract('<h1>Hello World</h1>');
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('Hello World');
      expect(result[0].type).toBe('text');
    });

    it('extracts text from multiple elements', () => {
      const result = extract(`
        <div>
          <h1>Title</h1>
          <p>Body text</p>
        </div>
      `);
      expect(result).toHaveLength(2);
      expect(result.map(r => r.value)).toEqual(['Title', 'Body text']);
    });

    it('skips whitespace-only text', () => {
      const result = extract('<div>   </div>');
      expect(result).toHaveLength(0);
    });

    it('extracts text from buttons', () => {
      const result = extract('<button>Submit</button>');
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('Submit');
    });

    it('handles multi-line JSX text', () => {
      const result = extract(`
        <p>
          This is a paragraph
          that spans multiple lines
        </p>
      `);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('This is a paragraph that spans multiple lines');
    });
  });

  describe('JSX attributes', () => {
    it('extracts placeholder attribute', () => {
      const result = extract('<input placeholder="Enter your email" />');
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('Enter your email');
      expect(result[0].type).toBe('attribute');
      expect(result[0].attributeName).toBe('placeholder');
    });

    it('extracts title attribute', () => {
      const result = extract('<a title="Go to homepage">Home</a>');
      const titleExtraction = result.find(r => r.attributeName === 'title');
      expect(titleExtraction).toBeDefined();
      expect(titleExtraction!.value).toBe('Go to homepage');
    });

    it('extracts alt attribute', () => {
      const result = extract('<img alt="Company logo" src="/logo.png" />');
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('Company logo');
      expect(result[0].attributeName).toBe('alt');
    });

    it('extracts aria-label', () => {
      const result = extract('<button aria-label="Close dialog">X</button>');
      const ariaExtraction = result.find(r => r.attributeName === 'aria-label');
      expect(ariaExtraction).toBeDefined();
      expect(ariaExtraction!.value).toBe('Close dialog');
    });

    it('does NOT extract className', () => {
      const result = extract('<div className="flex items-center">Hello</div>');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('text');
      expect(result[0].value).toBe('Hello');
    });

    it('does NOT extract href', () => {
      const result = extract('<a href="https://example.com">Link</a>');
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('Link');
    });

    it('does NOT extract data-testid', () => {
      const result = extract('<div data-testid="hero-section">Hello</div>');
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('Hello');
    });

    it('does NOT extract key prop', () => {
      const result = extract('<div key="unique-id">Hello</div>');
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('Hello');
    });

    it('does NOT extract type attribute', () => {
      const result = extract('<input type="text" placeholder="Name" />');
      expect(result).toHaveLength(1);
      expect(result[0].attributeName).toBe('placeholder');
    });

    it('does NOT extract src attribute', () => {
      const result = extract('<img src="/images/logo.png" alt="Logo" />');
      expect(result).toHaveLength(1);
      expect(result[0].attributeName).toBe('alt');
    });
  });

  describe('template literals', () => {
    it('extracts template literal with variable', () => {
      const code = 'const x = <p>{`Hello ${name}`}</p>';
      const result = extract(code);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('Hello {name}');
      expect(result[0].type).toBe('template');
      expect(result[0].interpolations).toHaveLength(1);
      expect(result[0].interpolations![0].name).toBe('name');
    });

    it('extracts template literal with member expression', () => {
      const code = 'const x = <p>{`Welcome ${user.firstName}`}</p>';
      const result = extract(code);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('Welcome {firstName}');
      expect(result[0].interpolations![0].name).toBe('firstName');
    });

    it('extracts template literal with multiple variables', () => {
      const code = 'const x = <p>{`Hello ${name}, you have ${count} items`}</p>';
      const result = extract(code);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('Hello {name}, you have {count} items');
      expect(result[0].interpolations).toHaveLength(2);
    });
  });

  describe('string expressions', () => {
    it('extracts string literal in JSX expression container', () => {
      const result = extract('<p>{"Hello World"}</p>');
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('Hello World');
      expect(result[0].type).toBe('string-expression');
    });
  });

  describe('fragments', () => {
    it('extracts text from fragment children', () => {
      const code = `
        const x = (
          <>
            <span>Hello</span>
            <span>World</span>
          </>
        )
      `;
      const result = extract(code);
      expect(result).toHaveLength(2);
      expect(result.map(r => r.value)).toEqual(['Hello', 'World']);
    });
  });

  describe('conditionals', () => {
    it('extracts text from both branches of ternary', () => {
      const code = `
        const x = (
          <div>
            {flag ? <span>Yes</span> : <span>No items</span>}
          </div>
        )
      `;
      const result = extract(code);
      expect(result.map(r => r.value)).toContain('Yes');
      expect(result.map(r => r.value)).toContain('No items');
    });
  });

  describe('TypeScript', () => {
    it('handles TypeScript generics', () => {
      const code = `
        function Card<T extends { title: string }>({ data }: { data: T }) {
          return <div><p>Card content</p></div>;
        }
      `;
      const result = extract(code);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('Card content');
    });

    it('handles typed props', () => {
      const code = `
        const Greeting: React.FC<{ name: string }> = ({ name }) => (
          <p>Welcome back</p>
        );
      `;
      const result = extract(code);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('Welcome back');
    });
  });

  describe('non-translatable contexts', () => {
    it('does NOT extract import strings', () => {
      const code = `
        import React from 'react';
        const x = <p>Hello</p>;
      `;
      const result = extract(code);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('Hello');
    });

    it('does NOT extract console.log strings', () => {
      const code = `
        console.log('debug message');
        const x = <p>Visible</p>;
      `;
      const result = extract(code);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('Visible');
    });
  });

  describe('edge cases', () => {
    it('assigns keys correctly per file path', () => {
      const result = extract('<button>Submit</button>', 'src/pages/Login.tsx');
      expect(result[0].key).toMatch(/^pages\.login\./);
    });

    it('handles empty component', () => {
      const result = extract('<div></div>');
      expect(result).toHaveLength(0);
    });

    it('handles component with only non-translatable content', () => {
      const code = `
        <div className="flex" data-testid="main">
          <img src="/logo.png" />
        </div>
      `;
      const result = extract(code);
      expect(result).toHaveLength(0);
    });
  });
});
