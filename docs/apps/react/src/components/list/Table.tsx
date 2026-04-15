import { useState, useMemo, type CSSProperties } from 'react';
import { VirtList } from '@virt-list/react';
import '../../demo.css';

interface Row {
  id: number;
  name: string;
  desc1: string;
  desc2: string;
  action: string;
}

function generateList(count: number): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `用户_${i}`,
    desc1: `这是用户 ${i} 的详细描述信息，可能是一段较长的文本`,
    desc2: `补充说明 ${i}，包含更多关于该用户的信息`,
    action: '操作',
  }));
}

const stickyLeft: CSSProperties = {
  position: 'sticky',
  left: 0,
  zIndex: 1,
  background: '#fff',
};

const stickyRight: CSSProperties = {
  position: 'sticky',
  right: 0,
  zIndex: 1,
  background: '#fff',
};

function Cell({
  text,
  style,
}: {
  text: string;
  style?: CSSProperties;
}) {
  return (
    <div className="demo-table-cell" style={style}>
      {text}
    </div>
  );
}

export default function Table() {
  const list = useMemo(() => generateList(1000), []);
  const [stats, setStats] = useState(`总数: ${list.length} | 表格模式（水平滚动 + sticky 列）`);

  return (
    <div className="demo-panel">
      <div className="demo-stats">{stats}</div>
      <div className="demo-list-container">
        <VirtList<Row>
          list={list}
          itemKey="id"
          itemPreSize={40}
          stickyHeaderStyle={{ background: '#f0f0f0' }}
          renderStickyHeader={() => (
            <div className="demo-table-row demo-table-header">
              <Cell
                text="ID"
                style={{ ...stickyLeft, width: 80, minWidth: 80, background: '#e0e0e0' }}
              />
              <Cell text="名称" style={{ width: 120, minWidth: 120 }} />
              <Cell text="描述1" style={{ width: 600, minWidth: 600 }} />
              <Cell text="描述2" style={{ width: 600, minWidth: 600 }} />
              <Cell
                text="操作"
                style={{ ...stickyRight, width: 80, minWidth: 80, background: '#e0e0e0' }}
              />
            </div>
          )}
          onUpdate={(_, state) =>
            setStats(`总数: ${list.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`)
          }
        >
          {({ itemData }) => (
            <div className="demo-table-row">
              <Cell text={String(itemData.id)} style={{ ...stickyLeft, width: 80, minWidth: 80 }} />
              <Cell text={String(itemData.name)} style={{ width: 120, minWidth: 120 }} />
              <Cell text={String(itemData.desc1)} style={{ width: 600, minWidth: 600 }} />
              <Cell text={String(itemData.desc2)} style={{ width: 600, minWidth: 600 }} />
              <div
                className="demo-table-cell"
                style={{ ...stickyRight, width: 80, minWidth: 80 }}
              >
                <button
                  type="button"
                  className="virt-list-btn virt-list-btn-primary"
                  style={{ fontSize: 10, padding: '2px 8px' }}
                >
                  详情
                </button>
              </div>
            </div>
          )}
        </VirtList>
      </div>
    </div>
  );
}
