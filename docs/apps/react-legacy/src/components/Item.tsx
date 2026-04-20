interface DemoItem {
  index: number;
  text: string;
}

export default function Item({ item }: { item: DemoItem }) {
  return (
    <div className="demo-row-item">
      <div className="demo-row-index">#{item.index}</div>
      <div className="demo-row-text">{item.text}</div>
    </div>
  );
}
