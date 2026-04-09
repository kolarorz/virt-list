import { useRef, useState, useCallback, useEffect } from 'react';
import { VirtList, type VirtListRef } from '@virt-list/react';
import '../../demo.css';

interface Item {
  id: number;
  index: number;
  text: string;
}

const SENTENCES = [
  '滚动到底部会自动触发加载更多数据。',
  '新数据加载完成后会追加到列表末尾。',
  '加载过程中 footer 区域会显示加载提示，防止重复触发。数据加载完成后，虚拟列表会自动更新渲染范围，新增的行会无缝衔接到现有内容之后。',
  '短行。',
  '无限加载模式适用于数据量不确定的场景，比如社交媒体的信息流、搜索结果列表等。每次加载一页数据，用户可以一直向下滚动浏览。',
];

let uid = 0;

function generateList(count: number, startIndex = 0): Item[] {
  return Array.from({ length: count }, (_, i) => {
    const idx = startIndex + i;
    const n = (idx % 4) + 1;
    const parts: string[] = [];
    for (let s = 0; s < n; s++) parts.push(SENTENCES[(idx + s * 2) % SENTENCES.length]);
    return { id: uid++, index: idx, text: parts.join(' ') };
  });
}

function delayItems(count: number, startIndex: number, ms: number): Promise<Item[]> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(generateList(count, startIndex)), ms),
  );
}

export default function Infinity() {
  const [list, setList] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState('');
  const virtListRef = useRef<VirtListRef<Item>>(null);
  const busyRef = useRef(false);
  const loadingUiRef = useRef(false);
  loadingUiRef.current = loading;
  const listRef = useRef<Item[]>([]);
  listRef.current = list;

  const loadMore = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    const start = listRef.current.length;
    const newItems = await delayItems(200, start, 1000);
    busyRef.current = false;
    setLoading(false);
    setList((prev) => prev.concat(newItems));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      busyRef.current = true;
      setLoading(true);
      const first = await delayItems(200, 0, 0);
      if (cancelled) return;
      setList(first);
      busyRef.current = false;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="demo-panel">
      <div className="demo-stats">{stats}</div>
      <div className="demo-list-container">
        <VirtList<Item>
          ref={virtListRef}
          list={list}
          itemKey="id"
          itemPreSize={40}
          buffer={2}
          onToBottom={() => {
            void loadMore();
          }}
          onRangeUpdate={(begin, end) => {
            setStats(
              `总数: ${list.length} | RenderBegin: ${begin} | RenderEnd: ${end}${loadingUiRef.current ? ' | 加载中...' : ''}`,
            );
          }}
          renderFooter={() =>
            loading ? <div className="demo-loading-bar">加载中...</div> : null
          }
          renderItem={(item) => (
            <div className="demo-row-item">
              <span className="demo-row-index">#{item.index}</span>
              <span className="demo-row-text">{item.text}</span>
            </div>
          )}
        />
      </div>
    </div>
  );
}
