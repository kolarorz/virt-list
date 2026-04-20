import { useState, useMemo, type CSSProperties } from 'react';
import { VirtList } from '@virt-list/react-legacy';
import '../../demo.css';

interface Item {
  id: number;
  index: number;
  text: string;
}

const SENTENCES = [
  '插槽示例展示了 stickyHeader、header、footer、stickyFooter 四种插槽的使用方法。',
  '短行。',
  'Sticky 插槽会固定在滚动容器的顶部或底部，不会随内容一起滚动。这在需要展示固定表头或固定操作栏的场景中非常实用。',
  '普通 header 和 footer 会随列表内容一起滚动。',
  '每一行的高度各不相同，这是因为文本内容的长度不同导致自然换行。虚拟列表会在渲染后准确测量每个元素的尺寸，从而保证滚动行为的正确性。',
];

function generateList(count: number): Item[] {
  return Array.from({ length: count }, (_, i) => {
    const n = (i % 4) + 1;
    const parts: string[] = [];
    for (let s = 0; s < n; s++) parts.push(SENTENCES[(i + s * 2) % SENTENCES.length]);
    return { id: i, index: i, text: parts.join(' ') };
  });
}

const slotBase: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  fontSize: 14,
  color: '#fff',
};

export default function Slots() {
  const list = useMemo(() => generateList(1000), []);
  const [stats, setStats] = useState(`总数: ${list.length} | 含 Sticky/Header/Footer 插槽`);

  return (
    <div className="demo-panel">
      <div className="demo-stats">{stats}</div>
      <div className="demo-list-container">
        <VirtList<Item>
          list={list}
          itemKey="id"
          itemPreSize={40}
          stickyHeaderStyle={{ background: '#2e8b57', height: 50 }}
          renderStickyHeader={() => (
            <div style={slotBase}>Sticky Header（固定头部）</div>
          )}
          renderHeader={() => (
            <div style={{ ...slotBase, background: '#3cb371', height: 40 }}>Header（头部）</div>
          )}
          renderFooter={() => (
            <div style={{ ...slotBase, background: '#20b2aa', height: 40 }}>Footer（尾部）</div>
          )}
          stickyFooterStyle={{ background: '#008b8b', height: 50 }}
          renderStickyFooter={() => (
            <div style={slotBase}>Sticky Footer（固定底部）</div>
          )}
          onUpdate={(_, state) =>
            setStats(`总数: ${list.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`)
          }
        >
          {({ itemData }) => (
            <div className="demo-row-item">
              <span className="demo-row-index">#{itemData.index}</span>
              <span className="demo-row-text">{itemData.text}</span>
            </div>
          )}
        </VirtList>
      </div>
    </div>
  );
}
