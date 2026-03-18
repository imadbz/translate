export function Plurals({ count }: { count: number }) {
  return (
    <div>
      <p>{count === 1 ? '1 item' : `${count} items`}</p>
      <p>{`You have ${count} new messages`}</p>
      <span>No items found</span>
    </div>
  );
}
