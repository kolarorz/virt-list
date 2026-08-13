import { useState, useMemo } from 'react';
import { VirtList } from '@virt-list/react-legacy';

// demo:fold 示例数据构造：Item、SENTENCES、generateList()
interface Item {
  id: number;
  index: number;
  text: string;
}

const SENTENCES = [
  '使用扁平渲染模式，children 内容直接挂载到 item wrapper 上，无额外包裹层。',
  '短行。',
  '对比插槽 demo 中 children 内容被一层 <div> 包裹的情况，扁平渲染减少了一层 DOM 嵌套，CSS 选择器也更简洁。',
  '这对于表格行、高频滚动等对 DOM 层级敏感的场景尤其有用。',
  'React 的 Fragment 支持让多个元素可以直接作为 children 输出，无需额外包裹。',
];

function generateList(count: number): Item[] {
  return Array.from({ length: count }, (_, i) => {
    const n = (i % 4) + 1;
    const parts: string[] = [];
    for (let s = 0; s < n; s++) parts.push(SENTENCES[(i + s * 2) % SENTENCES.length]);
    return { id: i, index: i, text: parts.join(' ') };
  });
}
// /demo:fold

export default function FlatRender() {
  const list = useMemo(() => generateList(1000), []);
  const [stats, setStats] = useState('总数: 1000 | 扁平渲染模式');

  return (
    <div className="demo-panel">
      <div className="demo-stats">{stats}</div>
      <div className="demo-list-container">
        <VirtList<Item>
          list={list}
          itemKey="id"
          estimatedSize={40}
          buffer={2}
          stickyHeaderClass="demo-band demo-band--sticky-header"
          renderStickyHeader={() => (
            <span className="demo-band__text">stickyHeader（固定头部）</span>
          )}
          headerClass="demo-band demo-band--header"
          renderHeader={() => <span className="demo-band__text">header（头部）</span>}
          footerClass="demo-band demo-band--footer"
          renderFooter={() => <span className="demo-band__text">footer（尾部）</span>}
          stickyFooterClass="demo-band demo-band--sticky-footer"
          renderStickyFooter={() => (
            <span className="demo-band__text">stickyFooter（固定底部）</span>
          )}
          itemClass="demo-row-item"
          onUpdate={(_, state) =>
            setStats(`总数: ${list.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`)
          }
        >
          {({ itemData }) => (
            <>
              <span className="demo-row-index">#{itemData.index}</span>
              <span className="demo-row-text">{itemData.text}</span>
            </>
          )}
        </VirtList>
      </div>
    </div>
  );
}
