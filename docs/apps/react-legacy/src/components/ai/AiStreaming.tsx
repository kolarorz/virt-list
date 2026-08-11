import { useCallback, useEffect, useRef, useState } from 'react';
import { VirtList, type LoadDirection, type LoadState, type VirtListRef } from '@virt-list/react-legacy';
import {
  createAiMessage,
  fetchAiPage,
  generateAiPage,
  randomAsk,
  sliceIntoChunks,
  STREAM_ANSWER,
  type AiMessage,
} from '../../../../_shared/aiData';
import { formatAiStats } from '../../../../_shared/demoStats';

const PAGE_SIZE = 20;
const TICK = 45;

export default function AiStreaming() {
  const vlRef = useRef<VirtListRef<AiMessage>>(null);
  const pageRef = useRef(4);
  const [list, setList] = useState<AiMessage[]>(() => generateAiPage(pageRef.current, PAGE_SIZE));
  const [stats, setStats] = useState('');
  const [atBottom, setAtBottom] = useState(true);
  const [pendingNew, setPendingNew] = useState(0);

  /**
   * 正在生成的那条消息的文本单独放一个 state。
   *
   * React 里若每个 token 都去改 list，就得重建整个数组（不可变更新），
   * 开销随消息数增长。把流式文本拿出来单独存，每一帧只有一个字符串在变，
   * list 的引用不动——虚拟列表因此完全不需要重算区间与尺寸索引。
   */
  const [streamText, setStreamText] = useState('');
  /**
   * 同一个值存两份：state 驱动界面（按钮禁用、气泡光标），
   * ref 供定时器闭包读——闭包里拿不到最新的 state。
   */
  const [streamingId, setStreamingId] = useState<number | null>(null);
  const streamIdRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const listRef = useRef(list);
  listRef.current = list;
  const loadStateRef = useRef<LoadState | null>(null);
  const atBottomRef = useRef(atBottom);
  atBottomRef.current = atBottom;

  const updateStats = useCallback((state?: any) => {
    setStats(
      formatAiStats({
        total: listRef.current.length,
        streaming: streamIdRef.current !== null,
        atBottom: atBottomRef.current,
        state,
        loadState: loadStateRef.current,
      }),
    );
  }, []);

  const onLoadMore = useCallback(async (direction: LoadDirection) => {
    if (direction !== 'top') return false;
    const older = await fetchAiPage(pageRef.current - 1, PAGE_SIZE);
    pageRef.current -= 1;
    setList((prev) => older.concat(prev));
    return pageRef.current > 1;
  }, []);

  const stopStream = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const id = streamIdRef.current;
    if (id === null) return;

    // 流式结束，把最终文本落回 list（这一次才需要重建数组），并摘掉光标
    setList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, text: textRef.current, streaming: false } : item,
      ),
    );
    streamIdRef.current = null;
    setStreamingId(null);
    setStreamText('');
    updateStats();
  }, [updateStats]);

  /** setState 是异步的，定时器里要读最新文本，用 ref 兜住 */
  const textRef = useRef('');

  const ask = useCallback(() => {
    if (streamIdRef.current !== null) return;

    const base = listRef.current.length;
    const question = createAiMessage(base, 'user', randomAsk());
    const answer = createAiMessage(base + 1, 'assistant', '', true);
    setList((prev) => [...prev, question, answer]);
    streamIdRef.current = answer.id;
    setStreamingId(answer.id);
    textRef.current = '';
    setStreamText('');

    const chunks = sliceIntoChunks(STREAM_ANSWER);
    let i = 0;
    timerRef.current = window.setInterval(() => {
      if (i >= chunks.length) {
        stopStream();
        return;
      }
      textRef.current += chunks[i];
      i += 1;
      setStreamText(textRef.current);
    }, TICK);
  }, [stopStream]);

  useEffect(() => () => {
    if (timerRef.current !== null) clearInterval(timerRef.current);
  }, []);

  return (
    <div className="demo-panel">
      <div className="demo-stats">{stats}</div>
      <div className="demo-list-container">
        <VirtList<AiMessage>
          ref={vlRef}
          list={list}
          itemKey="id"
          estimatedSize={80}
          initialPosition="bottom"
          stickyBottom
          hasMoreBottom={false}
          loadMore={onLoadMore}
          onScroll={(e) => setAtBottom(e.atEnd)}
          onLoadStateChange={(s) => {
            loadStateRef.current = s;
            setPendingNew(s.pendingNew);
            updateStats();
          }}
          onUpdate={(_, state) => updateStats(state)}
          renderHeader={(loadState) => (
            <div className="demo-loading-bar">
              {loadState.loadingTop
                ? '加载历史消息...'
                : loadState.hasMoreTop
                  ? ''
                  : '没有更早的对话了'}
            </div>
          )}
        >
          {({ itemData }) => {
            // 正在生成的那条读 streamText，其余读数据里的定稿
            const streaming = itemData.id === streamingId;
            return (
              <div className={`demo-chat-message demo-ai-row${itemData.role === 'user' ? ' is-user' : ''}`}>
                <div className="demo-chat-bubble">
                  <span>{streaming ? streamText : itemData.text}</span>
                  {streaming && <span className="demo-ai-caret" />}
                </div>
              </div>
            );
          }}
        </VirtList>
      </div>
      <div className="demo-chat-toolbar">
        <button
          type="button"
          className="virt-list-btn virt-list-btn-primary"
          disabled={streamingId !== null}
          onClick={ask}
        >
          提问
        </button>
        <button
          type="button"
          className="virt-list-btn"
          disabled={streamingId === null}
          onClick={stopStream}
        >
          停止生成
        </button>
        <button
          type="button"
          className="virt-list-btn"
          disabled={atBottom}
          onClick={() => vlRef.current?.scrollToBottom()}
        >
          {pendingNew > 0 ? `回到底部（${pendingNew} 条新消息）` : '回到底部'}
        </button>
      </div>
    </div>
  );
}
