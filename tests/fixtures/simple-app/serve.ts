import { serve } from '@hono/node-server';
import { createRoutes } from '../../../packages/server/src/routes.js';

const app = createRoutes();

const server = serve({ fetch: app.fetch, port: 3100 }, async () => {
  console.log('Translation server running on http://localhost:3100');

  // Seed locale translations for the simple-app project
  const locales: Record<string, Record<string, string>> = {
    fr: {
      'app.language': 'Langue :',
      'checkout_page.checkout': 'Paiement',
      'checkout_page.pay_now': 'Payer maintenant',
      'checkout_page.review_your_order_before_paying': 'Vérifiez votre commande avant de payer',
      'nav.account': 'Compte',
      'nav.home': 'Accueil',
      'nav.main_navigation': 'Navigation principale',
      'nav.sign_in': 'Se connecter',
      'profile.get_help': "Obtenir de l'aide",
      'profile.hello_name': 'Bonjour {name}',
      'profile.help': 'Aide',
      'profile.search_orders': 'Rechercher des commandes',
      'profile.you_have_itemcount_items_in_your': 'Vous avez {itemCount} articles dans votre panier',
      'profile.your_cart_is_empty': 'Votre panier est vide',
    },
    ar: {
      'app.language': 'اللغة:',
      'checkout_page.checkout': 'الدفع',
      'checkout_page.pay_now': 'ادفع الآن',
      'checkout_page.review_your_order_before_paying': 'راجع طلبك قبل الدفع',
      'nav.account': 'الحساب',
      'nav.home': 'الرئيسية',
      'nav.main_navigation': 'التنقل الرئيسي',
      'nav.sign_in': 'تسجيل الدخول',
      'profile.get_help': 'احصل على مساعدة',
      'profile.hello_name': 'مرحباً {name}',
      'profile.help': 'مساعدة',
      'profile.search_orders': 'البحث في الطلبات',
      'profile.you_have_itemcount_items_in_your': 'لديك {itemCount} عناصر في سلة التسوق',
      'profile.your_cart_is_empty': 'سلة التسوق فارغة',
    },
  };

  for (const [locale, translations] of Object.entries(locales)) {
    await fetch(`http://localhost:3100/projects/simple-app/locales/${locale}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(translations),
    });
  }

  console.log('Seeded fr + ar translations for simple-app');
});
