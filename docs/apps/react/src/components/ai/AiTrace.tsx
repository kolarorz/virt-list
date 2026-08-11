import { useCallback, useEffect, useRef, useState } from 'react';
import { VirtList, type VirtListRef } from '@virt-list/react';
import {
  createTraceLine,
  generateTraceLines,
  KIND_LABEL,
  type TraceLine,
} from '../../../../_shared/traceData';

const TICK = 120;
const LINES_PER_TICK = 3;
const BURST = 10000;

const copyText = (item: TraceLine) =>
  `[${KIND_LABEL[item.kind]}] ${String(item.seq).padStart(5, ' ')}  ${item.text}`;

export default function AiTrace() {
  const vlRef = useRef<VirtListRef<TraceLine>>(null);
  const [list, setList] = useState<TraceLine[]>(() => generateTraceLines(60));
  const [running, setRunning] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [range, setRange] = useState({ begin: 0, end: 0 });
  const [lastAppendMs, setLastAppendMs] = useState(0);
  /** 展开的行 id 集合。存 id 而不是改 list，避免为了一个布尔量重建整个数组 */
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

  const seqRef = useRef(list.length);
  const timerRef = useRef<number | null>(null);

  /**
   * 一次提交一批，而不是每行一次。
   *
   * 日志的到达是突发的，逐行 setState 会把开销全花在重复的区间计算上，
   * 而这些计算在同一帧内的结果是等价的。
   */
  const append = useCallback((count: number) => {
    const batch = Array.from({ length: count }, () => createTraceLine(seqRef.current++));
    const started = performance.now();
    setList((prev) => prev.concat(batch));
    setLastAppendMs(performance.now() - started);
  }, []);

  const toggleRun = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setRunning(false);
    } else {
      timerRef.current = window.setInterval(() => append(LINES_PER_TICK), TICK);
      setRunning(true);
    }
  }, [append]);

  /** 展开/收起一行：高度变化不必通知组件，ResizeObserver 会量到 */
  const toggle = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** 一次展开全部：几百行同时从一行变成九行，是最容易露白的时刻 */
  const toggleAll = useCallback(() => {
    setExpanded((prev) =>
      prev.size > 0 ? new Set() : new Set(list.filter((l) => l.detail).map((l) => l.id)),
    );
  }, [list]);

  const clear = useCallback(() => {
    seqRef.current = 0;
    vlRef.current?.reset();
    setExpanded(new Set());
    setList([]);
  }, []);

  useEffect(() => () => {
    if (timerRef.current !== null) clearInterval(timerRef.current);
  }, []);

  return (
    <div className="demo-panel">
      <div className="demo-stats">
        {[
          `行数: ${list.length}`,
          running ? '执行中' : '已停止',
          atBottom ? '跟随中' : '已脱离跟随',
          `渲染区间: ${range.begin} - ${range.end}`,
          `上次追加: ${lastAppendMs.toFixed(1)}ms`,
        ].join(' | ')}
      </div>
      <div className="demo-list-container demo-trace">
        <VirtList<TraceLine>
          ref={vlRef}
          list={list}
          itemKey="id"
          estimatedSize={24}
          initialPosition="bottom"
          stickyBottom
          hasMoreTop={false}
          hasMoreBottom={false}
          copyText={copyText}
          onScroll={(e) => setAtBottom(e.atEnd)}
          onUpdate={(_, state) => setRange({ begin: state.renderBegin, end: state.renderEnd })}
        >
          {({ itemData }) => {
            const isOpen = expanded.has(itemData.id);
            return (
              <div className={`demo-trace-line kind-${itemData.kind}`}>
                <div
                  className={`demo-trace-head${itemData.detail ? ' is-clickable' : ''}`}
                  onClick={itemData.detail ? () => toggle(itemData.id) : undefined}
                >
                  <span className="demo-trace-caret">
                    {itemData.detail ? (isOpen ? '▾' : '▸') : ' '}
                  </span>
                  <span className="demo-trace-seq">{String(itemData.seq).padStart(5, ' ')}</span>
                  <span className="demo-trace-badge">{KIND_LABEL[itemData.kind]}</span>
                  <span className="demo-trace-text">{itemData.text}</span>
                </div>
                {itemData.detail && isOpen && (
                  <pre className="demo-trace-detail">{itemData.detail}</pre>
                )}
              </div>
            );
          }}
        </VirtList>
      </div>
      <div className="demo-chat-toolbar">
        <button type="button" className="virt-list-btn virt-list-btn-primary" onClick={toggleRun}>
          {running ? '暂停执行' : '开始执行'}
        </button>
        <button type="button" className="virt-list-btn" onClick={() => append(BURST)}>
          灌入 1 万行
        </button>
        <button type="button" className="virt-list-btn" onClick={toggleAll}>
          {expanded.size > 0 ? '收起全部工具调用' : '展开全部工具调用'}
        </button>
        <button type="button" className="virt-list-btn" onClick={clear}>
          清空
        </button>
        <button
          type="button"
          className="virt-list-btn"
          disabled={atBottom}
          onClick={() => vlRef.current?.scrollToBottom()}
        >
          回到底部
        </button>
      </div>
    </div>
  );
}
