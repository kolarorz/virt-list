import { useState, useMemo } from 'react';
import { VirtList } from '@virt-list/react';
import '../../demo.css';

interface Item {
  id: number;
  index: number;
  text: string;
}

const SENTENCES = [
  '拖拽容器右下角可以调整大小，虚拟列表会自动适应新的容器尺寸。',
  '容器变大时会渲染更多的行。',
  '这种自适应能力依赖于 ResizeObserver 对容器尺寸变化的监听。当容器的可视区域发生变化时，虚拟列表会重新计算需要渲染的元素数量，并更新视图。',
  '短行。',
  '无论容器是变大还是变小，滚动位置和列表状态都会被正确保留。这意味着用户在调整窗口大小时不会丢失当前的浏览位置。',
  '每一行的高度都不同，体现了动态高度的特性。',
];

function generateList(count: number): Item[] {
  return Array.from({ length: count }, (_, i) => {
    const n = (i % 5) + 1;
    const parts: string[] = [];
    for (let s = 0; s < n; s++) parts.push(SENTENCES[(i + s * 2) % SENTENCES.length]);
    return { id: i, index: i, text: parts.join(' ') };
  });
}

export default function Resize() {
  const list = useMemo(() => generateList(2000), []);
  const [stats, setStats] = useState(`总数: ${list.length} | 拖拽容器边框调整大小`);

  return (
    <div className="demo-panel">
      <div className="demo-stats">{stats}</div>
      <div className="demo-resize-container">
        <VirtList<Item>
          list={list}
          itemKey="id"
          itemPreSize={40}
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
