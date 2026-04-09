import { useRef, useState, useCallback, useEffect } from 'react';
import { VirtList, type VirtListRef } from '@virt-list/react';
import '../../demo.css';

const PAGE_SIZE = 20;
const PAGE_MAX = 10;

let uid = 0;

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
  '双向分页模式适用于消息列表、日志浏览等场景。用户可以在时间线上自由导航，而不需要一次性加载所有数据。这种模式通过 addedList2Top 和 deletedList2Top 两个 API 来实现数据的动态增删，同时保持滚动位置的稳定。',
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
  const virtListRef = useRef<VirtListRef<Item>>(null);
  const loadingTopRef = useRef(false);
  const loadingBottomRef = useRef(false);
  const firstResizeRef = useRef(true);

  const updateStats = useCallback(
    (begin?: number, end?: number) => {
      const extra = loadingTopRef.current || loadingBottomRef.current ? ' | 加载中...' : '';
      setStats(
        `总数: ${list.length} | Page: ${pageRef.current} | RenderBegin: ${begin ?? '-'} | RenderEnd: ${end ?? '-'}${extra}`,
      );
    },
    [list.length],
  );

  useEffect(() => {
    updateStats();
  }, [updateStats]);

  const onToTop = useCallback(async () => {
    const vl = virtListRef.current;
    if (!vl || loadingTopRef.current || pageRef.current <= 2) return;
    loadingTopRef.current = true;
    updateStats();

    const prevPageData = await asyncGeneratePage(pageRef.current - 2);
    pageRef.current--;

    setList((prev) => {
      const removed = prev.slice(-PAGE_SIZE);
      vl.deletedList2Top(removed);
      const next = prevPageData.concat(prev.slice(0, -PAGE_SIZE));
      vl.addedList2Top(prevPageData);
      return next;
    });

    loadingTopRef.current = false;
    updateStats();
  }, [updateStats]);

  const onToBottom = useCallback(async () => {
    const vl = virtListRef.current;
    if (!vl || loadingBottomRef.current || pageRef.current >= PAGE_MAX) return;
    loadingBottomRef.current = true;
    updateStats();

    const nextPageData = await asyncGeneratePage(pageRef.current + 1);
    pageRef.current++;

    setList((prev) => {
      const removed = prev.slice(0, PAGE_SIZE);
      vl.deletedList2Top(removed);
      const next = prev.slice(PAGE_SIZE).concat(nextPageData);
      return next;
    });

    loadingBottomRef.current = false;
    updateStats();
  }, [updateStats]);

  const onItemResize = useCallback(() => {
    if (firstResizeRef.current) {
      firstResizeRef.current = false;
      virtListRef.current?.scrollToBottom();
    }
  }, []);

  return (
    <div className="demo-panel">
      <div className="demo-stats">{stats}</div>
      <div className="demo-list-container">
        <VirtList<Item>
          ref={virtListRef}
          list={list}
          itemKey="id"
          itemPreSize={60}
          buffer={2}
          onToTop={onToTop}
          onToBottom={onToBottom}
          onItemResize={onItemResize}
          onRangeUpdate={(begin, end) => {
            const extra = loadingTopRef.current || loadingBottomRef.current ? ' | 加载中...' : '';
            setStats(
              `总数: ${list.length} | Page: ${pageRef.current} | RenderBegin: ${begin} | RenderEnd: ${end}${extra}`,
            );
          }}
          renderHeader={() => (
            <div className="demo-loading-bar">
              {pageRef.current > 2 ? '上拉加载...' : '没有更早的数据了'}
            </div>
          )}
          renderFooter={() => (
            <div className="demo-loading-bar">
              {pageRef.current < PAGE_MAX ? '下拉加载...' : '没有更新的数据了'}
            </div>
          )}
          renderItem={(item) => (
            <div className="demo-chat-message">
              <div className="demo-chat-bubble">
                <div style={{ fontWeight: 'bold', marginBottom: 2 }}>消息 #{item.index}</div>
                <div>{item.text}</div>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
}
