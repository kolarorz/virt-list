import { useState, useMemo } from 'react';
import { VirtList } from '@virt-list/react';

const WIDTHS = [76, 92, 108, 124, 148];

interface Item {
  id: number;
  width: number;
}

function generateList(count: number): Item[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    width: WIDTHS[Math.floor(Math.random() * WIDTHS.length)],
  }));
}

export default function Horizontal() {
  const list = useMemo(() => generateList(1000), []);
  const [stats, setStats] = useState(`总数: ${list.length} | 水平滚动`);

  return (
    <div className="demo-panel">
      <div className="demo-stats">{stats}</div>
      <div className="demo-horizontal-container">
        <VirtList<Item>
          list={list}
          itemKey="id"
          itemPreSize={108}
          horizontal
          onUpdate={(_, state) =>
            setStats(`总数: ${list.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`)
          }
        >
          {({ itemData }) => (
            <div
              className="demo-col-item"
              style={{ minWidth: itemData.width, width: itemData.width }}
            >
              <div className="demo-col-card">
                <span className="demo-col-index">{itemData.id}</span>
                <span className="demo-col-size">{itemData.width}px</span>
              </div>
            </div>
          )}
        </VirtList>
      </div>
    </div>
  );
}
