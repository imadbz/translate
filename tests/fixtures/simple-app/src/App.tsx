import { useLocale } from '@translate/react';
import { CheckoutPage } from './CheckoutPage';
import { Profile } from './Profile';
import { Nav } from './Nav';

export function App() {
  const { locale, setLocale, availableLocales } = useLocale();

  return (
    <div>
      <div style={{ padding: '1rem', background: '#f0f0f0', marginBottom: '1rem' }}>
        <strong>Language:</strong>{' '}
        {availableLocales.map((l) => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            style={{
              marginRight: '0.5rem',
              fontWeight: locale === l ? 'bold' : 'normal',
              textDecoration: locale === l ? 'underline' : 'none',
            }}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      <Nav isLoggedIn={true} />
      <Profile name="Alice" itemCount={3} />
      <CheckoutPage />
    </div>
  );
}
