import { useState, useMemo } from 'react';
import { VirtList } from '@virt-list/react';
import '../../demo.css';

const WIDTHS = [60, 80, 100, 110, 130];

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
          itemPreSize={60}
          horizontal
          buffer={2}
          onRangeUpdate={(begin, end) =>
            setStats(`总数: ${list.length} | RenderBegin: ${begin} | RenderEnd: ${end}`)
          }
          renderItem={(item) => (
            <div
              className="demo-col-item"
              style={{ minWidth: item.width, width: item.width }}
            >
              <div style={{ fontWeight: 'bold' }}>{item.id}</div>
              <div style={{ fontSize: 11, color: '#999' }}>w:{item.width}</div>
            </div>
          )}
        />
      </div>
    </div>
  );
}
