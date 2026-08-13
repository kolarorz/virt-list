import { useRef, useState, useCallback } from 'react';
import { VirtList, type LoadDirection, type LoadState } from '@virt-list/react-legacy';

// demo:fold 示例数据构造：Item、SENTENCES、generateList()
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
// /demo:fold

function delayItems(count: number, startIndex: number, ms: number): Promise<Item[]> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(generateList(count, startIndex)), ms),
  );
}

export default function Infinity() {
  const [list, setList] = useState<Item[]>([]);
  const [stats, setStats] = useState('');
  const loadStateRef = useRef<LoadState | null>(null);
  /** 事件回调里要读最新的 list，用 ref 兜住闭包 */
  const listRef = useRef<Item[]>(list);
  listRef.current = list;

  const updateStats = useCallback((state?: any) => {
    setStats(
      `总数: ${listRef.current.length} | 可视区域: ${state?.inViewBegin ?? '-'} - ${state?.inViewEnd ?? '-'} | 渲染区间: ${state?.renderBegin ?? '-'} - ${state?.renderEnd ?? '-'}${
        loadStateRef.current?.loadingBottom ? ' | 加载中...' : ''
      }`,
    );
  }, []);

  /**
   * 触底取数。
   *
   * 列表初始为空，首屏这一次加载也由组件自动发起——内容填不满视口时会继续要
   * 下一页，不需要在 useEffect 里手动拉第一页。
   */
  const onLoadMore = useCallback(async (direction: LoadDirection) => {
    if (direction !== 'bottom') return false;
    const newItems = await delayItems(200, listRef.current.length, 1000);
    setList((prev) => prev.concat(newItems));
    return true;
  }, []);

  return (
    <div className="demo-panel">
      <div className="demo-stats">{stats}</div>
      <div className="demo-list-container">
        <VirtList<Item>
          list={list}
          itemKey="id"
          estimatedSize={40}
          loadMore={onLoadMore}
          hasMoreTop={false}
          onLoadStateChange={(s) => {
            loadStateRef.current = s;
            updateStats();
          }}
          onUpdate={(_, state) => updateStats(state)}
          renderFooter={(loadState) => (
            <div className="demo-loading-bar">{loadState.loadingBottom ? '加载中...' : ' '}</div>
          )}
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
