import { useState, useMemo } from 'react';
import { VirtList } from '@virt-list/react-legacy';

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

/** 四个插槽共用一套排版，只有色带和文案不同 */
function Band({ variant, tag, text, note }: BandProps) {
  return (
    <div className={`demo-band demo-band--${variant}`}>
      <span className="demo-band__tag">{tag}</span>
      <span className="demo-band__text">{text}</span>
      <span className="demo-band__note">{note}</span>
    </div>
  );
}

interface BandProps {
  variant: 'sticky-header' | 'header' | 'footer' | 'sticky-footer';
  tag: string;
  text: string;
  note: string;
}

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
          renderStickyHeader={() => (
            <Band
              variant="sticky-header"
              tag="stickyHeader"
              text="固定头部"
              note="吸在容器顶部，不随内容滚动"
            />
          )}
          renderHeader={() => (
            <Band
              variant="header"
              tag="header"
              text="头部"
              note="排在第一项之前，随内容一起滚动"
            />
          )}
          renderFooter={() => (
            <Band
              variant="footer"
              tag="footer"
              text="尾部"
              note="排在最后一项之后，随内容一起滚动"
            />
          )}
          renderStickyFooter={() => (
            <Band
              variant="sticky-footer"
              tag="stickyFooter"
              text="固定底部"
              note="吸在容器底部，不随内容滚动"
            />
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
