import { useCallback, useRef, useState } from 'react';
import { VirtList, type LoadDirection, type LoadState } from '@virt-list/react-legacy';

const PAGE_SIZE = 40;

let uid = 0;

interface Item {
  id: number;
  index: number;
  text: string;
}

const CHAT_MSGS = [
  '好的，收到！',
  '这个方案看起来不错，我觉得可以按这个方向继续推进。',
  '你有空的时候帮我看一下那个 bug 吗？就是用户反馈的列表滚动卡顿问题。',
  '明天的会议改到下午三点了，记得提前准备一下演示材料。',
  '我刚刚测试了一下新版本的虚拟列表组件，在十万条数据的情况下滚动依然非常流畅，完全没有掉帧的情况。之前用全量渲染的方案在五千条数据时就开始卡顿了，这次的优化效果非常明显！',
  '👍',
  '关于上次讨论的技术选型问题，我整理了一份对比文档，包括性能测试数据、社区活跃度、学习成本等方面的分析。总体来看，新方案在各方面都有优势。等你有空了我们再详细讨论一下具体的迁移计划。',
  '周末愉快！',
];

function generatePage(page: number, pageSize: number): Item[] {
  const start = (page - 1) * pageSize;
  return Array.from({ length: pageSize }, (_, i) => {
    const idx = start + i;
    return {
      id: uid++,
      index: idx,
      text: CHAT_MSGS[idx % CHAT_MSGS.length],
    };
  });
}

function asyncGeneratePage(page: number, pageSize: number): Promise<Item[]> {
  return new Promise((resolve) => setTimeout(() => resolve(generatePage(page, pageSize)), 800));
}

export default function Chat() {
  const pageRef = useRef(5);
  const [list, setList] = useState<Item[]>(() => generatePage(pageRef.current, PAGE_SIZE));
  const [stats, setStats] = useState('');
  const loadStateRef = useRef<LoadState | null>(null);
  /** 事件回调里要读最新的 list，用 ref 兜住闭包 */
  const listRef = useRef(list);
  listRef.current = list;

  const updateStats = useCallback((state?: any) => {
    const parts = [
      `总数: ${listRef.current.length}`,
      `Page: ${pageRef.current}`,
      `可视区域: ${state?.inViewBegin ?? '-'} - ${state?.inViewEnd ?? '-'}`,
      `渲染区间: ${state?.renderBegin ?? '-'} - ${state?.renderEnd ?? '-'}`,
    ];
    if (loadStateRef.current?.loadingTop) parts.push('加载中...');
    // 用户正在翻历史时收到的新消息数，实际项目里可以拿它渲染「N 条新消息」角标
    const pending = loadStateRef.current?.pendingNew ?? 0;
    if (pending > 0) parts.push(`${pending} 条新消息`);
    setStats(parts.join(' | '));
  }, []);

  /**
   * 向上加载更早的消息。
   *
   * 只需取数并写入 list，返回是否还有更早的数据。防重入、加载中不重复触发、
   * 加载后的滚动位置补偿与重新渲染都由组件内部完成。
   */
  const onLoadMore = useCallback(async (direction: LoadDirection) => {
    if (direction !== 'top') return false;
    const prevPage = await asyncGeneratePage(pageRef.current - 1, PAGE_SIZE);
    pageRef.current--;
    setList((prev) => prevPage.concat(prev));
    return pageRef.current > 1;
  }, []);

  /** 发消息只管往列表里加，stickyBottom 负责「贴底时才跟随」 */
  const onSend = useCallback(() => {
    setList((prev) => [
      ...prev,
      {
        id: uid++,
        index: prev.length,
        text: CHAT_MSGS[Math.floor(Math.random() * CHAT_MSGS.length)],
      },
    ]);
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
          hasMoreBottom={false}
          initialPosition="bottom"
          stickyBottom
          onLoadStateChange={(s) => {
            loadStateRef.current = s;
            updateStats();
          }}
          onUpdate={(_, state) => updateStats(state)}
          renderHeader={(loadState) => (
            <div className="demo-loading-bar">
              {loadState.loadingTop ? '加载中...' : loadState.hasMoreTop ? '' : '没有更早的消息了'}
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
      <div className="demo-chat-toolbar">
        <button type="button" className="virt-list-btn virt-list-btn-primary" onClick={onSend}>
          发送随机消息
        </button>
      </div>
    </div>
  );
}
