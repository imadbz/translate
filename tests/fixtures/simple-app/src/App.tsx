import { CheckoutPage } from './CheckoutPage';
import { Profile } from './Profile';
import { Nav } from './Nav';

export function App() {
  return (
    <div>
      <Nav isLoggedIn={true} />
      <Profile name="Alice" itemCount={3} />
      <CheckoutPage />
    </div>
  );
}
