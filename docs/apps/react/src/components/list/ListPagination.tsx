import { useRef, useState, useCallback } from 'react';
import { VirtList, type LoadDirection, type LoadState } from '@virt-list/react';

const PAGE_SIZE = 50;
const PAGE_MAX = 10;

let uid = 0;

// demo:fold 示例数据构造：Item、PAGE_MSGS、generatePage()
interface Item {
  id: number;
  index: number;
  text: string;
}

const PAGE_MSGS = [
  '短消息。',
  '这是一条普通长度的分页消息，展示双向分页加载的效果。',
  '向上滚动会加载更早的数据，向下滚动会加载更新的数据。同时，离开可视区域较远的数据会被移除，以控制内存中的数据量。',
  '分页已加载。',
  '双向分页模式适用于消息列表、日志浏览等场景。用户可以在时间线上自由导航，而不需要一次性加载所有数据。数据的增删只需要照常改 list，滚动位置由组件自动补偿。',
  '翻到顶部或底部都可以触发新一页的加载。',
];

function generatePage(page: number): Item[] {
  const start = (page - 1) * PAGE_SIZE;
  return Array.from({ length: PAGE_SIZE }, (_, i) => {
    const idx = start + i;
    return {
      id: uid++,
      index: idx,
      text: PAGE_MSGS[idx % PAGE_MSGS.length],
    };
  });
}
// /demo:fold

function asyncGeneratePage(page: number): Promise<Item[]> {
  return new Promise((resolve) => setTimeout(() => resolve(generatePage(page)), 1000));
}

export default function Pagination() {
  const pageRef = useRef(PAGE_MAX);
  const [list, setList] = useState<Item[]>(() => [
    ...generatePage(pageRef.current - 1),
    ...generatePage(pageRef.current),
  ]);
  const [stats, setStats] = useState('');
  const loadStateRef = useRef<LoadState | null>(null);
  /** 事件回调里要读最新的 list，用 ref 兜住闭包 */
  const listRef = useRef(list);
  listRef.current = list;

  const updateStats = useCallback((state?: any) => {
    const loading = loadStateRef.current?.loadingTop || loadStateRef.current?.loadingBottom;
    setStats(
      `总数: ${listRef.current.length} | Page: ${pageRef.current} | 可视区域: ${state?.inViewBegin ?? '-'} - ${state?.inViewEnd ?? '-'} | 渲染区间: ${state?.renderBegin ?? '-'} - ${state?.renderEnd ?? '-'}${
        loading ? ' | 加载中...' : ''
      }`,
    );
  }, []);

  /**
   * 双向分页取数。
   *
   * 一端加一页、另一端裁一页——即使总长度不变，组件也能识别出头部的结构变化
   * 并补偿滚动位置，不需要手动补偿，也不需要 forceUpdate。
   */
  const onLoadMore = useCallback(async (direction: LoadDirection) => {
    if (direction === 'top') {
      if (pageRef.current <= 2) return false;
      const prevPage = await asyncGeneratePage(pageRef.current - 2);
      pageRef.current--;
      setList((prev) => prevPage.concat(prev.slice(0, prev.length - PAGE_SIZE)));
      return pageRef.current > 2;
    }

    if (pageRef.current >= PAGE_MAX) return false;
    const nextPage = await asyncGeneratePage(pageRef.current + 1);
    pageRef.current++;
    setList((prev) => prev.slice(PAGE_SIZE).concat(nextPage));
    return pageRef.current < PAGE_MAX;
  }, []);

  return (
    <div className="demo-panel">
      <div className="demo-stats">{stats}</div>
      <div className="demo-list-container">
        <VirtList<Item>
          list={list}
          itemKey="id"
          estimatedSize={60}
          loadMore={onLoadMore}
          initialPosition="bottom"
          onLoadStateChange={(s) => {
            loadStateRef.current = s;
            updateStats();
          }}
          onUpdate={(_, state) => updateStats(state)}
          renderHeader={(loadState) => (
            <div className="demo-loading-bar">
              {loadState.loadingTop
                ? '加载中...'
                : loadState.hasMoreTop
                  ? '上拉加载...'
                  : '没有更早的数据了'}
            </div>
          )}
          renderFooter={(loadState) => (
            <div className="demo-loading-bar">
              {loadState.loadingBottom
                ? '加载中...'
                : loadState.hasMoreBottom
                  ? '下拉加载...'
                  : '没有更新的数据了'}
            </div>
          )}
        >
          {({ itemData }) => (
            <div className="demo-chat-message">
              <div className="demo-chat-bubble">
                <div style={{ fontWeight: 'bold', marginBottom: 2 }}>消息 #{itemData.index}</div>
                <div>{itemData.text}</div>
              </div>
            </div>
          )}
        </VirtList>
      </div>
    </div>
  );
}
