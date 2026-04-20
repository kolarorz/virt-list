import { useRef, useState } from 'react';
import { faker } from '@faker-js/faker';
import { VirtGrid as VirtGridRoot, type VirtGridRef } from '@virt-list/react';
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
          renderCell={(item: (typeof list)[number], index: number, rowIndex: number) => {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.innerHTML = `
        <div>
          <div style="font-size:12px;color:#999;">row:${rowIndex} - item:${index}</div>
          <div style="display:flex;align-items:center;">
            <img src="${item.avatar}" style="width:40px;height:40px;border-radius:50%;" />
            <span style="margin-left:6px;">${item.name}</span>
          </div>
        </div>
        <button class="grid-delete-btn" data-id="${item.id}">delete</button>
      `;

            const deleteBtn = cell.querySelector('.grid-delete-btn');
            deleteBtn?.addEventListener('click', () => {
              const id = item.id;
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
            });
            return cell;
          }}
        />
      </div>
    </div>
  );
}
