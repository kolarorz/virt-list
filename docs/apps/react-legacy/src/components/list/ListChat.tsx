import { useRef, useState, useCallback } from 'react';
import { VirtList, type VirtListRef } from '@virt-list/react-legacy';
import '../../demo.css';

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
  const virtListRef = useRef<VirtListRef<Item>>(null);
  const loadingRef = useRef(false);
  const firstResizeRef = useRef(true);
  const listLenRef = useRef(list.length);
  listLenRef.current = list.length;

  const updateStats = useCallback((state?: any) => {
    setStats(
      `总数: ${listLenRef.current} | Page: ${pageRef.current} | 可视区域: ${state?.inViewBegin ?? '-'} - ${state?.inViewEnd ?? '-'} | 渲染区间: ${state?.renderBegin ?? '-'} - ${state?.renderEnd ?? '-'}`,
    );
  }, []);

  const onToTop = useCallback(async () => {
    const vl = virtListRef.current;
    if (!vl || loadingRef.current || pageRef.current <= 1) return;
    loadingRef.current = true;
    setStats(
      `总数: ${list.length} | Page: ${pageRef.current} | 加载中...`,
    );
    const prevPage = await asyncGeneratePage(pageRef.current - 1, PAGE_SIZE);
    pageRef.current--;
    setList((prev) => {
      const next = prevPage.concat(prev);
      listLenRef.current = next.length;
      vl.addedList2Top(prevPage);
      return next;
    });
    loadingRef.current = false;
    updateStats();
  }, [list.length, updateStats]);

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
          onToTop={onToTop}
          onItemResize={onItemResize}
          onUpdate={(_, state) => {
            setStats(
              `总数: ${list.length} | Page: ${pageRef.current} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`,
            );
          }}
          renderHeader={() => (
            <div className="demo-loading-bar">
              {pageRef.current > 1 ? '加载中...' : '没有更早的消息了'}
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
