import { useState, useMemo } from 'react';
import { VirtList } from '@virt-list/react-legacy';
import '../../demo.css';

interface Item {
  id: number;
  index: number;
  text: string;
}

function generateList(count: number): Item[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    index: i,
    text: `固定高度行 ${i}，每行高度一致（40px）。`,
  }));
}

export default function Fixed() {
  const list = useMemo(() => generateList(1000), []);
  const [stats, setStats] = useState(`总数: ${list.length} | 固定高度: 40px`);

  return (
    <div className="demo-panel">
      <div className="demo-stats">{stats}</div>
      <div className="demo-list-container">
        <VirtList<Item>
          list={list}
          itemKey="id"
          itemPreSize={40}
          fixed
          onUpdate={(_, state) =>
            setStats(`总数: ${list.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`)
          }
        >
          {({ itemData }) => (
            <div className="demo-row-item" style={{ height: 40, lineHeight: '40px' }}>
              <span className="demo-row-index">#{itemData.index}</span>
              <span className="demo-row-text">{itemData.text}</span>
            </div>
          )}
        </VirtList>
      </div>
    </div>
  );
}
