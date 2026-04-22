import { useRef, useState } from 'react';
import { faker } from '@faker-js/faker';
import { VirtGrid as VirtGridRoot, type VirtGridRef } from '@virt-list/react-legacy';
import { GridItem } from './GridItem';
import '../../demo.css';

function generateData(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: faker.string.nanoid(),
    index: i,
    avatar: faker.image.avatar(),
    name: faker.person.firstName(),
  }));
}

export default function VirtGrid() {
  const [list, setList] = useState(() => generateData(1000));
  const [status, setStatus] = useState('网格示例已就绪：1000 项数据，2 列');
  const gridRef = useRef<VirtGridRef>(null);

  const setGridItems = (n: number) => {
    gridRef.current?.setGridItems(n);
    setStatus(`gridItems 已设为 ${n}`);
  };

  return (
    <div className="virt-grid-demo">
      <div className="virt-grid-controls">
        <span>gridItems:</span>
        {[2, 3, 4, 5, 6].map((n) => (
          <button key={n} type="button" className="virt-list-btn virt-list-btn-primary" onClick={() => setGridItems(n)}>
            {n}
          </button>
        ))}
      </div>
      <div className="status-text">{status}</div>
      <div className="virt-grid-container" style={{ width: '100%', height: 500 }}>
        <VirtGridRoot
          ref={gridRef}
          list={list}
          gridItems={2}
          itemKey="id"
          itemPreSize={70}
          onToTop={() => {
            setStatus('已滚动到顶部');
          }}
        >
          {({ itemData, index, rowIndex }) => (
            <GridItem
              item={itemData as (typeof list)[number]}
              index={index}
              rowIndex={rowIndex}
              onDelete={() => {
                const id = itemData.id;
                setList((prev) => {
                  const idx = prev.findIndex((v) => v.id === id);
                  if (idx > -1) {
                    const next = prev.slice();
                    next.splice(idx, 1);
                    setStatus(`已删除 item ${index}，剩余 ${next.length} 项`);
                    return next;
                  }
                  return prev;
                });
              }}
            />
          )}
        </VirtGridRoot>
      </div>
    </div>
  );
}
