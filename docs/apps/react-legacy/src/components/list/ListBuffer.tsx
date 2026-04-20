import { useState, useRef, useCallback, useEffect } from 'react';
import { VirtList, type VirtListRef } from '@virt-list/react-legacy';
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
  '相比传统的全量渲染方式，虚拟列表可以将 DOM 节点数量控制在一个很小的范围内，从而大幅提升滚动性能和内存效率。即使数据量达到数十万条，滚动体验依然流畅。',
  '支持自动添加数据。',
  '滚动过程中，列表会根据当前的滚动位置计算出需要渲染的起始和结束索引，只创建必要的 DOM 节点。被移出可视区域的节点会被及时回收，避免内存泄漏。',
];

let uid = 0;

function generateList(count: number, startIndex = 0): Item[] {
  return Array.from({ length: count }, (_, i) => {
    const idx = startIndex + i;
    const sentenceCount = (idx % 5) + 1;
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

export default function Basic() {
  const [list, setList] = useState<Item[]>(() => generateList(1000));
  const [stats, setStats] = useState('');
  const [addCount, setAddCount] = useState(1000);
  const [autoVisible, setAutoVisible] = useState(true);
  const virtListRef = useRef<VirtListRef<Item>>(null);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onAdd = useCallback(() => {
    const count = addCount || 1000;
    setList((prev) => prev.concat(generateList(count, prev.length)));
  }, [addCount]);

  const onAutoAdd = useCallback(() => {
    setAutoVisible(false);
    autoTimerRef.current = setInterval(() => {
      setList((prev) => {
        if (prev.length >= 500000) {
          if (autoTimerRef.current) clearInterval(autoTimerRef.current);
          autoTimerRef.current = null;
          setAutoVisible(true);
          return prev;
        }
        return prev.concat(generateList(1000, prev.length));
      });
    }, 100);
  }, []);

  const onStop = useCallback(() => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    setAutoVisible(true);
  }, []);

  useEffect(
    () => () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    },
    [],
  );

  return (
    <div className="demo-panel">
      <div className="demo-toolbar">
        <label>添加数量：</label>
        <input
          type="number"
          value={addCount}
          min={1}
          onChange={(e) => setAddCount(parseInt(e.target.value, 10) || 1000)}
          style={{ width: 80 }}
        />
        <button type="button" className="virt-list-btn virt-list-btn-primary" onClick={onAdd}>
          手动添加
        </button>
        {autoVisible ? (
          <button type="button" className="virt-list-btn virt-list-btn-success" onClick={onAutoAdd}>
            自动添加
          </button>
        ) : (
          <button type="button" className="virt-list-btn virt-list-btn-secondary" onClick={onStop}>
            停止
          </button>
        )}
      </div>
      <div className="demo-stats">{stats || `总数: ${list.length}`}</div>
      <div className="demo-list-container">
        <VirtList<Item>
          ref={virtListRef}
          list={list}
          itemKey="id"
          itemPreSize={40}
          buffer={5}
          onUpdate={(_, state) =>
            setStats(`总数: ${list.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`)
          }
        >
          {({ itemData }) => <Item item={itemData} />}
        </VirtList>
      </div>
    </div>
  );
}
