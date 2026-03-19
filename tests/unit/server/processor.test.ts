import { describe, it, expect } from 'vitest';
import { processFiles } from '@translate/server/processor';
import { getModel } from '@translate/server/model';

const model = getModel();
const opts = { model, locales: ['en'] };

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

  it('extracts translations into en locale', async () => {
    const result = await processFiles([checkoutFile], opts);
    expect(result.translations).toHaveProperty('en');
    const en = result.translations.en;
    expect(Object.values(en)).toContain('Checkout');
    expect(Object.values(en)).toContain('Pay now');
    expect(Object.values(en)).toContain('Review your order before paying');
  });

  it('emits t() calls in transformed files', async () => {
    const result = await processFiles([checkoutFile], opts);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].content).toContain('__t(');
    expect(result.files[0].content).toContain('@translate/react');
  });

  it('preserves non-translatable content in transformed files', async () => {
    const result = await processFiles([checkoutFile], opts);
    expect(result.files[0].content).toContain('btn-primary');
    expect(result.files[0].content).toContain('submit');
  });

  it('processes multiple files independently', async () => {
    const navFile = {
      path: 'src/Nav.tsx',
      content: `
        export function Nav() {
          return <nav><a href="/">Home</a></nav>;
        }
      `,
    };

    const result = await processFiles([checkoutFile, navFile], opts);
    expect(result.files).toHaveLength(2);
    expect(Object.values(result.translations.en)).toContain('Home');
    expect(Object.values(result.translations.en)).toContain('Pay now');
  });

  it('handles files with no translatable strings', async () => {
    const emptyFile = {
      path: 'src/Empty.tsx',
      content: `
        export function Empty() {
          return <div className="flex"></div>;
        }
      `,
    };

    const result = await processFiles([emptyFile], opts);
    expect(result.files).toHaveLength(1);
    expect(Object.keys(result.translations.en)).toHaveLength(0);
    expect(result.files[0].content).not.toContain('__t(');
  });

  it('injects useTranslation hook into components', async () => {
    const result = await processFiles([checkoutFile], opts);
    expect(result.files[0].content).toContain('__useT()');
  });
});
