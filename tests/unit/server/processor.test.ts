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

  it('extracts translations from files', () => {
    const result = processFiles([checkoutFile], 'en');
    expect(Object.keys(result.translations).length).toBeGreaterThan(0);
    expect(Object.values(result.translations)).toContain('Checkout');
    expect(Object.values(result.translations)).toContain('Pay now');
    expect(Object.values(result.translations)).toContain('Review your order before paying');
  });

  it('returns files unchanged for English locale (identity)', () => {
    const result = processFiles([checkoutFile], 'en');
    expect(result.files).toHaveLength(1);
    expect(result.files[0].content).toBe(checkoutFile.content);
  });

  it('replaces strings for non-English locale', () => {
    const frTranslations = {
      'checkout_page.checkout': 'Paiement',
      'checkout_page.review_your_order_before_paying': 'Vérifiez votre commande avant de payer',
      'checkout_page.pay_now': 'Payer maintenant',
    };

    const result = processFiles([checkoutFile], 'fr', frTranslations);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].content).toContain('Paiement');
    expect(result.files[0].content).toContain('Payer maintenant');
    expect(result.files[0].content).not.toContain('>Checkout<');
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

    const result = processFiles([checkoutFile, navFile], 'en');
    expect(result.files).toHaveLength(2);
    expect(Object.values(result.translations)).toContain('Home');
    expect(Object.values(result.translations)).toContain('Pay now');
  });

  it('preserves non-translatable content', () => {
    const result = processFiles([checkoutFile], 'fr', {
      'checkout_page.checkout': 'Paiement',
      'checkout_page.pay_now': 'Payer maintenant',
      'checkout_page.review_your_order_before_paying': 'Vérifiez',
    });
    // className should be preserved
    expect(result.files[0].content).toContain('btn-primary');
    expect(result.files[0].content).toContain('submit');
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

    const result = processFiles([emptyFile], 'en');
    expect(result.files).toHaveLength(1);
    expect(Object.keys(result.translations)).toHaveLength(0);
  });
});
