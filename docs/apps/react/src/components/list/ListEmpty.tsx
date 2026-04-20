import { useState, useRef } from 'react';
import { VirtList, type VirtListRef } from '@virt-list/react';
import Item from '../Item';
import '../../demo.css';

interface Item {
  id: number;
  index: number;
  text: string;
}

const SENTENCES = [
  '虚拟列表是一种高性能的列表渲染方案，只渲染可视区域内的元素。',
  '通过动态计算每个元素的位置和大小，可以高效地处理海量数据。',
  '每一行的内容长度不同，高度也会随之变化，这正是动态高度虚拟列表的核心能力。',
  '当列表项的高度不固定时，需要在渲染后测量实际尺寸并更新位置信息。',
  '这段文本比较短。',
];

let uid = 0;

function generateList(count: number, startIndex = 0): Item[] {
  return Array.from({ length: count }, (_, i) => {
    const idx = startIndex + i;
    const sentenceCount = (idx % 4) + 1;
    const parts: string[] = [];
    for (let s = 0; s < sentenceCount; s++) {
      parts.push(SENTENCES[(idx + s * 3) % SENTENCES.length]);
    }
    return {
      id: uid++,
      index: idx,
      text: parts.join(' '),
    };
  });
}

export default function Empty() {
  const [list, setList] = useState<Item[]>([]);
  const [stats, setStats] = useState('总数: 0');
  const [isEmpty, setIsEmpty] = useState(true);
  const virtListRef = useRef<VirtListRef<Item>>(null);

  const onToggle = () => {
    if (isEmpty) {
      const newList = generateList(1000);
      setList(newList);
      setStats(`总数: ${newList.length}`);
    } else {
      setList([]);
      setStats('总数: 0');
    }
    setIsEmpty(!isEmpty);
  };

  return (
    <div className="demo-panel">
      <div className="demo-toolbar">
        <button type="button" className="virt-list-btn virt-list-btn-primary" onClick={onToggle}>
          {isEmpty ? '切换为有数据列表' : '切换为空列表'}
        </button>
      </div>
      <div className="demo-stats">{stats}</div>
      <div className="demo-list-container">
        <VirtList<Item>
          ref={virtListRef}
          list={list}
          itemKey="id"
          itemPreSize={40}
          onUpdate={(_, state) =>
            setStats(`总数: ${list.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`)
          }
          renderEmpty={() => (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#999',
              }}
            >
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5z" />
                <line x1="9" y1="9" x2="15" y2="15" />
                <line x1="15" y1="9" x2="9" y2="15" />
              </svg>
              <p style={{ marginTop: 12, fontSize: 14 }}>暂无数据</p>
            </div>
          )}
        >
          {({ itemData }) => <Item item={itemData} />}
        </VirtList>
      </div>
    </div>
  );
}
