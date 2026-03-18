import { describe, it, expect } from 'vitest';
import { processFiles } from '@translate/server/processor';

describe('processFiles', () => {
  const checkoutFile = {
    path: 'src/CheckoutPage.tsx',
    content: `
      export function CheckoutPage() {
        return (
          <div>
            <h1>Checkout</h1>
            <p>Review your order before paying</p>
            <button className="btn-primary" type="submit">Pay now</button>
          </div>
        );
      }
    `,
  };

  it('extracts translations into en locale', () => {
    const result = processFiles([checkoutFile]);
    expect(result.translations).toHaveProperty('en');
    const en = result.translations.en;
    expect(Object.values(en)).toContain('Checkout');
    expect(Object.values(en)).toContain('Pay now');
    expect(Object.values(en)).toContain('Review your order before paying');
  });

  it('emits t() calls in transformed files', () => {
    const result = processFiles([checkoutFile]);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].content).toContain('__t(');
    expect(result.files[0].content).toContain('@translate/react');
  });

  it('includes additional locales when provided', () => {
    const fr = { 'checkout_page.checkout': 'Paiement' };
    const result = processFiles([checkoutFile], { fr });
    expect(result.translations).toHaveProperty('en');
    expect(result.translations).toHaveProperty('fr');
    expect(result.translations.fr['checkout_page.checkout']).toBe('Paiement');
  });

  it('preserves non-translatable content in transformed files', () => {
    const result = processFiles([checkoutFile]);
    expect(result.files[0].content).toContain('btn-primary');
    expect(result.files[0].content).toContain('submit');
  });

  it('processes multiple files independently', () => {
    const navFile = {
      path: 'src/Nav.tsx',
      content: `
        export function Nav() {
          return <nav><a href="/">Home</a></nav>;
        }
      `,
    };

    const result = processFiles([checkoutFile, navFile]);
    expect(result.files).toHaveLength(2);
    expect(Object.values(result.translations.en)).toContain('Home');
    expect(Object.values(result.translations.en)).toContain('Pay now');
  });

  it('handles files with no translatable strings', () => {
    const emptyFile = {
      path: 'src/Empty.tsx',
      content: `
        export function Empty() {
          return <div className="flex"></div>;
        }
      `,
    };

    const result = processFiles([emptyFile]);
    expect(result.files).toHaveLength(1);
    expect(Object.keys(result.translations.en)).toHaveLength(0);
    expect(result.files[0].content).not.toContain('__t(');
  });

  it('injects useTranslation hook into components', () => {
    const result = processFiles([checkoutFile]);
    expect(result.files[0].content).toContain('__useT()');
  });
});
