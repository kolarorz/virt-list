import { useMemo, useRef, useState } from 'react';
import { VirtList, type VirtListRef } from '@virt-list/react-legacy';
import '../../demo.css';

interface Item {
  id: number;
  index: number;
  text: string;
}

function generateList(count: number): Item[] {
  const texts = [
    '短文本。',
    '这是一段中等长度的文本内容，用来展示可变高度的虚拟列表项。',
    '这是一段比较长的文本内容，用来展示可变高度的虚拟列表项。每一行的高度都不同，虚拟列表需要动态计算每个元素的实际高度，以确保滚动位置的准确性。这是虚拟列表最核心的功能之一。',
    '极短',
    '这段文本的长度适中。它既不太短也不太长，但足以让虚拟列表检测到与其他行不同的高度。动态高度列表相比固定高度列表需要更多的计算，但它提供了更灵活的内容展示方式。可以在这里输入任意内容来改变行高。',
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    index: i,
    text: texts[i % texts.length],
  }));
}

export default function Dynamic() {
  const list = useMemo(() => generateList(200), []);
  const virtListRef = useRef<VirtListRef<Item>>(null);
  const [stats, setStats] = useState(`总数: ${list.length} | 可变高度 + 可编辑`);

  return (
    <div className="demo-panel">
      <div style={{ marginBottom: 8, fontSize: 12, color: '#888' }}>
        提示：点击内容区域可以直接编辑文本，行高会自动适应。
      </div>
      <div className="demo-stats">{stats}</div>
      <div className="demo-list-container">
        <VirtList<Item>
          ref={virtListRef}
          list={list}
          itemKey="id"
          itemPreSize={20}
          onUpdate={(_, state) =>
            setStats(`总数: ${list.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`)
          }
        >
          {({ itemData }) => (
            <div className="demo-row-item demo-dynamic-row">
              <span className="demo-row-index">#{itemData.index}</span>
              <div
                className="demo-editable"
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => {
                  itemData.text = e.currentTarget.textContent || '';
                  virtListRef.current?.forceUpdate();
                }}
              >
                {itemData.text}
              </div>
            </div>
          )}
        </VirtList>
      </div>
    </div>
  );
}
