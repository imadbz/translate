import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import translate from '../../../packages/vite-plugin/src/index.js';

export default defineConfig({
  plugins: [
    translate({
      serverUrl: 'http://localhost:3100',
      locale: 'fr',
      translations: {
        'checkout_page.checkout': 'Paiement',
        'checkout_page.review_your_order_before_paying': 'Vérifiez votre commande avant de payer',
        'checkout_page.pay_now': 'Payer maintenant',
        'profile.hello_name': 'Bonjour {name}',
        'profile.you_have_itemcount_items_in_your': 'Vous avez {itemCount} articles dans votre panier',
        'profile.search_orders': 'Rechercher des commandes',
        'profile.get_help': "Obtenir de l'aide",
        'profile.help': 'Aide',
        'profile.your_cart_is_empty': 'Votre panier est vide',
        'nav.main_navigation': 'Navigation principale',
        'nav.home': 'Accueil',
        'nav.account': 'Compte',
        'nav.sign_in': 'Se connecter',
      },
    }),
    react(),
  ],
});
