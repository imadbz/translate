export function Nav({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <>
      <nav aria-label="Main navigation">
        <a href="/">Home</a>
        {isLoggedIn ? <span>Account</span> : <span>Sign in</span>}
      </nav>
    </>
  );
}
