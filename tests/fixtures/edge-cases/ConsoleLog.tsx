export function ConsoleLog() {
  console.log('Component rendered');
  console.warn('Deprecation warning');
  console.error('Something went wrong');

  return (
    <div>
      <p>Visible text</p>
    </div>
  );
}
