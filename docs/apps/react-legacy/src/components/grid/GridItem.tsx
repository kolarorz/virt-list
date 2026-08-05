type GridItemData = {
  id: string;
  avatar: string;
  name: string;
};

type GridItemProps = {
  item: GridItemData;
  listIndex: number;
  rowIndex: number;
  onDelete: () => void;
};

export function GridItem(props: GridItemProps) {
  const { item, listIndex, rowIndex, onDelete } = props;
  return (
    <div className="grid-cell">
      <div>
        <div style={{ fontSize: 12, color: 'var(--demo-c-text-3)' }}>{`row:${rowIndex} - item:${listIndex}`}</div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src={item.avatar} style={{ width: 40, height: 40, borderRadius: '50%' }} />
          <span style={{ marginLeft: 6 }}>{item.name}</span>
        </div>
      </div>
      <button className="grid-delete-btn" onClick={onDelete}>delete</button>
    </div>
  );
}
