import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VirtList, type VirtListRef } from '@virt-list/react-legacy';
import {
  createTraceLine,
  generateTraceLines,
  KIND_LABEL,
  STATUS_ICON,
  type TraceLine,
} from '../../../../_shared/traceData';
import { activeSection, buildOutline } from '../../../../_shared/outline';
import { formatMs, toolStatusLabel } from '../../../../_shared/agentBlocks';
import AgentOutput from './parts/AgentOutput';

const TICK = 120;
const LINES_PER_TICK = 3;
const BURST = 10000;

// TraceStatus 是 ToolStatus 的子集，可以直接查表
const copyText = (item: TraceLine) =>
  `[${KIND_LABEL[item.kind]}] ${String(item.seq).padStart(5, ' ')}  ${item.text}` +
  (item.ms > 0 ? `  (${toolStatusLabel(item.status)} ${formatMs(item.ms)})` : '');

export default function AiTrace() {
  const vlRef = useRef<VirtListRef<TraceLine>>(null);
  const [list, setList] = useState<TraceLine[]>(() => generateTraceLines(60));
  const [running, setRunning] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [range, setRange] = useState({ begin: 0, end: 0, inView: 0 });
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
  const append = useCallback((count: number, running = false) => {
    const batch = Array.from({ length: count }, () => createTraceLine(seqRef.current++));
    // 执行中的话，末尾这行还没跑完，标成「执行中」
    const last = batch[batch.length - 1];
    if (running && last) last.status = 'running';

    const started = performance.now();
    setList((prev) => {
      // 上一批末尾那行还标着「执行中」，先落终态。React 下这意味着换一个对象，
      // 原地改属性不会触发重渲染
      const prevLast = prev[prev.length - 1];
      const head = prevLast?.status === 'running'
        ? [...prev.slice(0, -1), { ...prevLast, status: 'ok' as const }]
        : prev;
      return head.concat(batch);
    });
    setLastAppendMs(performance.now() - started);
  }, []);

  const toggleRun = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setRunning(false);
      setList((prev) => {
        const last = prev[prev.length - 1];
        return last?.status === 'running'
          ? [...prev.slice(0, -1), { ...last, status: 'ok' as const }]
          : prev;
      });
    } else {
      timerRef.current = window.setInterval(() => append(LINES_PER_TICK, true), TICK);
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

  /**
   * 阶段划分从数据里读出来（思考行开启一个新阶段），和语义滚动条示例用的是同一个函数。
   * 用 useMemo 挂在 list 上：滚动过程中只做一次 O(段数) 的查找，不重新分段。
   */
  const sections = useMemo(() => buildOutline(list), [list]);
  const current = activeSection(sections, range.inView);
  const currentSection = sections[current];

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
          estimatedSize={26}
          initialPosition="bottom"
          stickyBottom
          hasMoreTop={false}
          hasMoreBottom={false}
          copyText={copyText}
          onScroll={(e) => setAtBottom(e.atEnd)}
          onUpdate={(_, state) =>
            setRange({ begin: state.renderBegin, end: state.renderEnd, inView: state.inViewBegin })
          }
          /* 当前阶段悬浮在顶部：滚到哪一段，这里就显示那一段的标题 */
          renderStickyHeader={() => (
            <div className="demo-trace-stage">
              <span className="demo-trace-stage-index">
                阶段 {sections.length === 0 ? 0 : current + 1}/{sections.length}
              </span>
              <span className="demo-trace-stage-title">{currentSection?.title ?? '等待执行'}</span>
              {currentSection && currentSection.errors > 0 && (
                <span className="demo-trace-stage-errors">{currentSection.errors} 个错误</span>
              )}
            </div>
          )}
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
                  <span className={`demo-trace-status is-${itemData.status}`}>
                    {STATUS_ICON[itemData.status]}
                  </span>
                  <span className="demo-trace-badge">{KIND_LABEL[itemData.kind]}</span>
                  <span className="demo-trace-text">{itemData.text}</span>
                  {itemData.ms > 0 && (
                    <span className="demo-trace-ms">{formatMs(itemData.ms)}</span>
                  )}
                </div>
                {/* 展开后是终端回显或一段 diff，和消息里的工具卡走同一套渲染 */}
                {itemData.detail && isOpen && (
                  <div className="demo-trace-output">
                    <AgentOutput text={itemData.detail} kind={itemData.outputKind} />
                  </div>
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
