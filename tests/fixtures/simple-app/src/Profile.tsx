export function Profile({ name, itemCount }: { name: string; itemCount: number }) {
  return (
    <div>
      <h2>{`Hello ${name}`}</h2>
      <p>{`You have ${itemCount} items in your cart`}</p>
      <input placeholder="Search orders" />
      <a href="https://example.com/help" title="Get help">Help</a>
      {itemCount === 0 && <span>Your cart is empty</span>}
    </div>
  );
}
