import type { ReactNode } from 'react';

interface CardProps<T> {
  data: T;
  renderItem: (item: T) => ReactNode;
}

export function Card<T extends { title: string }>({ data, renderItem }: CardProps<T>) {
  return (
    <div>
      <h3>{data.title}</h3>
      <p>Card content</p>
      {renderItem(data)}
    </div>
  );
}

export function TypedPage() {
  const item = { title: 'My Item', description: 'A detailed description' };
  return (
    <Card
      data={item}
      renderItem={(d) => <span>{d.description}</span>}
    />
  );
}
