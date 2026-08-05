import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VirtList, type VirtListRef, type LoadDirection, type LoadState } from '@virt-list/react-legacy';
import {
  createChatMessage,
  fetchChatPage,
  generateChatPage,
  type ChatMessage,
} from '../../../../_shared/chatData';
import { formatChatStats } from '../../../../_shared/demoStats';
import { createBlankScreenDiagnostics } from '../../../../_shared/blankScreenDiagnostics';

const PAGE_SIZE = 30;
/** 超过这个字数才需要折叠 */
const COLLAPSE_MIN_LENGTH = 60;
/** 折叠时显示的行数 */
const COLLAPSED_LINES = 3;

/**
 * 单条消息气泡。
 *
 * 折叠状态刻意放在这个子组件内部：虚拟列表的项 DOM 由列表自己挂载，不在外层
 * 组件的渲染树上，外层 setState 并不会让已经渲染出来的项重新渲染。由子组件自己
 * 持有状态，点击时它自身重渲染，高度变化被 ResizeObserver 捕捉，列表就会自动
 * 修正后续内容的位置——不需要手动通知列表。
 */
function ChatBubble({
  item,
  initialExpanded,
  onToggle,
}: {
  item: ChatMessage;
  initialExpanded: boolean;
  onToggle: (open: boolean) => void;
}) {
  // 项滚出渲染窗口后 DOM 会被销毁，重新滚回来时由 initialExpanded 恢复
  const [open, setOpen] = useState(initialExpanded);

  const collapsible = item.text.length > COLLAPSE_MIN_LENGTH;
  const clamped = collapsible && !open;

  return (
    <div className="demo-chat-message">
      <div className="demo-chat-bubble">
        <div style={{ fontWeight: 'bold', marginBottom: 2 }}>消息 #{item.index}</div>
        <div
          style={
            clamped
              ? {
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: COLLAPSED_LINES,
                  overflow: 'hidden',
                }
              : undefined
          }
        >
          {item.text}
        </div>
        {collapsible && (
          <button
            type="button"
            style={{
              marginTop: 6,
              padding: 0,
              border: 'none',
              background: 'none',
              color: 'var(--demo-c-brand-1, #2a63f0)',
              cursor: 'pointer',
              fontSize: 13,
            }}
            onClick={() => {
              const next = !open;
              setOpen(next);
              onToggle(next);
            }}
          >
            {open ? '收起' : '展开'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ChatCollapse() {
  const pageRef = useRef(4);
  const [list, setList] = useState<ChatMessage[]>(() =>
    generateChatPage(pageRef.current, PAGE_SIZE),
  );
  const [stats, setStats] = useState('');
  const [diagText, setDiagText] = useState('');
  const virtListRef = useRef<VirtListRef<ChatMessage>>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadStateRef = useRef<LoadState | null>(null);

  /** 展开状态记录在列表数据之外，供项被重建时恢复 */
  const expandedIds = useRef(new Set<number>()).current;
  /** 事件回调里要读最新的 list，用 ref 兜住闭包 */
  const listRef = useRef(list);
  listRef.current = list;

  const updateStats = useCallback(
    (state?: any) => {
      setStats(
        formatChatStats({
          total: listRef.current.length,
          expanded: expandedIds.size,
          state,
          loadState: loadStateRef.current,
        }),
      );
    },
    [expandedIds],
  );

  /** 白屏自检（临时诊断，定位完会删掉）*/
  const diagnostics = useMemo(
    () =>
      createBlankScreenDiagnostics(
        {
          root: () => containerRef.current,
          listLength: () => listRef.current.length,
          slotSize: () => virtListRef.current?.slotSize,
          itemSize: (key) => virtListRef.current?.getItemSize(key) ?? -1,
        },
        setDiagText,
      ),
    [],
  );
  useEffect(() => () => diagnostics.dispose(), [diagnostics]);

  /**
   * 展开 / 收起单条消息。滚动只有一条规则，展开和收起共用：
   *
   * 顶部还在视口里 → 一动不动；顶部已滚出视口上方 → 拉回视口顶部。
   * 后者的理由是高度骤变会让视口内容整体错位（展开被中段文本淹没，
   * 收起被后面的消息顶上来），拉回顶部用户就能从头看这条消息。
   */
  const onToggle = useCallback(
    (id: number, open: boolean) => {
      const vl = virtListRef.current;
      const index = listRef.current.findIndex((it) => it.id === id);
      if (!vl || index < 0) return;

      if (open) expandedIds.add(id);
      else expandedIds.delete(id);

      // top 只取决于这一项上方的内容，与它自己的高度无关，尺寸变化前就能算准
      const { top } = vl.getItemPosByIndex(index);
      if (vl.getOffset() > top) vl.scrollToIndex(index);

      updateStats();
    },
    [expandedIds, updateStats],
  );

  /**
   * 批量展开 / 折叠。改的是外部记录，已渲染的项不会自己更新，需要 forceUpdate
   * 让列表重建渲染窗口内的项；所有项高度同时变化，视口失去参照，重建后再定位回去。
   */
  const setAll = useCallback(
    (open: boolean) => {
      const vl = virtListRef.current;
      const anchorIndex = vl?.getState().inViewBegin ?? 0;

      expandedIds.clear();
      if (open) listRef.current.forEach((it) => expandedIds.add(it.id));

      vl?.forceUpdate();
      vl?.scrollToIndex(anchorIndex);
      updateStats();
    },
    [expandedIds, updateStats],
  );

  const onLoadMore = useCallback(async (direction: LoadDirection) => {
    if (direction !== 'top') return false;
    const prevPage = await fetchChatPage(pageRef.current - 1, PAGE_SIZE);
    pageRef.current--;
    setList((prev) => prevPage.concat(prev));
    return pageRef.current > 1;
  }, []);

  /** 发消息只管往列表里加，stickyBottom 负责「贴底时才跟随」 */
  const onSend = useCallback(() => {
    setList((prev) => [...prev, createChatMessage(prev.length)]);
  }, []);

  return (
    <div className="demo-panel">
      <div className="demo-stats">{stats}</div>
      <div
        className="demo-stats"
        style={diagText ? { color: '#c00', fontWeight: 'bold' } : undefined}
      >
        自检：{diagText || '正常'}
      </div>
      <div ref={containerRef} className="demo-list-container">
        <VirtList<ChatMessage>
          ref={virtListRef}
          list={list}
          itemKey="id"
          itemPreSize={76}
          loadMore={onLoadMore}
          hasMoreBottom={false}
          initialPosition="bottom"
          stickyBottom
          onLoadStateChange={(s) => {
            loadStateRef.current = s;
            updateStats();
          }}
          onUpdate={(_, state) => {
            updateStats(state);
            diagnostics.schedule(state);
          }}
          onScroll={() => diagnostics.schedule(virtListRef.current?.getState())}
          renderHeader={(loadState) => (
            <div className="demo-loading-bar">
              {loadState.loadingTop
                ? '加载中...'
                : loadState.hasMoreTop
                  ? ''
                  : '没有更早的消息了'}
            </div>
          )}
        >
          {({ itemData }) => (
            <ChatBubble
              item={itemData}
              initialExpanded={expandedIds.has(itemData.id)}
              onToggle={(open) => onToggle(itemData.id, open)}
            />
          )}
        </VirtList>
      </div>
      <div className="demo-chat-toolbar">
        <button
          type="button"
          className="virt-list-btn virt-list-btn-primary"
          onClick={onSend}
        >
          发送随机消息
        </button>
        <button type="button" className="virt-list-btn" onClick={() => setAll(true)}>
          全部展开
        </button>
        <button type="button" className="virt-list-btn" onClick={() => setAll(false)}>
          全部折叠
        </button>
      </div>
    </div>
  );
}
