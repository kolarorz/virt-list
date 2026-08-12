import { useCallback, useEffect, useRef, useState } from 'react';
import { VirtList, type LoadDirection, type LoadState, type VirtListRef } from '@virt-list/react';
import {
  createAiMessage,
  fetchAiPage,
  generateAiPage,
  MODEL_NAME,
  QUICK_ASKS,
  sliceIntoChunks,
  type AiMessage,
} from '../../../../_shared/aiData';
import {
  blockSettled,
  blocksToPlainText,
  blockWithChunk,
  buildAnswerScript,
  stepHoldFrames,
  stepText,
  stepToBlock,
  type AgentBlock,
  type StreamStep,
} from '../../../../_shared/agentBlocks';
import { formatAiStats } from '../../../../_shared/demoStats';
import AgentMessage from './parts/AgentMessage';
import AgentShell from './parts/AgentShell';

const PAGE_SIZE = 20;
const TICK = 35;

/** 一次回答的演出脚本：思考 → 工具 → 正文 → 代码 → 工具 → 正文 → 图表 → 来源 */
const SCRIPT = buildAnswerScript();

const PHASE_TEXT: Record<StreamStep['type'], string> = {
  thinking: '正在思考',
  tool: '正在调用工具',
  text: '正在生成回答',
  code: '正在写代码',
  chart: '正在算数据',
  sources: '正在整理来源',
};

/**
 * 一条正在生成的回答。
 *
 * 它整个放在 ref 里，包括那份 `blocks`——**生成中的内容不进 list**。
 * 这是 React 下的关键取舍：若每帧都 setList，就要重建整个数组，开销随消息数增长，
 * 而列表结构压根没变。放在外面，list 的引用全程不动，虚拟列表完全不需要
 * 重算区间与尺寸索引；生成结束才落回 list 一次。
 */
interface Run {
  msgId: number;
  step: number;
  chunk: number;
  chunks: string[];
  hold: number;
  opened: boolean;
  startedAt: number;
  blocks: AgentBlock[];
}

export default function AiStreaming() {
  const vlRef = useRef<VirtListRef<AiMessage>>(null);
  const pageRef = useRef(4);
  const [list, setList] = useState<AiMessage[]>(() => generateAiPage(pageRef.current, PAGE_SIZE));
  const [stats, setStats] = useState('');
  const [atBottom, setAtBottom] = useState(true);
  const [pendingNew, setPendingNew] = useState(0);
  const [nodes, setNodes] = useState(0);

  /**
   * 生成中那几条消息的块（按消息 id 索引），外加顶部状态条要的两个数。
   *
   * 三样东西合成一个 state 是有意的：一帧里只做一次 setState。React 17 没有
   * 自动批处理，定时器回调里两次 setState 就是两次渲染。
   *
   * 每帧变的只有「最后一个块」的引用——AgentBlock 的 memo 会把前面所有块整个跳过。
   */
  const [live, setLive] = useState<{
    blocks: Record<number, AgentBlock[]>;
    count: number;
    lead: number;
  }>({ blocks: {}, count: 0, lead: 0 });

  /** 展开的块与点过赞的消息都存在集合里：项被回收时组件内部的状态会丢，集合不会 */
  const [expandedBlocks, setExpandedBlocks] = useState<ReadonlySet<string>>(() => new Set());
  const [likedIds, setLikedIds] = useState<ReadonlySet<number>>(() => new Set());

  const runsRef = useRef<Run[]>([]);
  const timerRef = useRef<number | null>(null);
  const listRef = useRef(list);
  listRef.current = list;
  const loadStateRef = useRef<LoadState | null>(null);
  const atBottomRef = useRef(atBottom);
  atBottomRef.current = atBottom;
  const lastCountAtRef = useRef(0);

  /**
   * 数一下当前渲染了多少 DOM 节点。
   *
   * 富消息里一个代码块就是十几个节点，这个数字比「渲染了几项」更能说明开销。
   * 遍历 DOM 本身有成本，所以节流到半秒一次——度量不该影响被度量的东西。
   */
  const countNodes = useCallback(() => {
    const now = performance.now();
    if (now - lastCountAtRef.current < 500) return;
    lastCountAtRef.current = now;
    const el = vlRef.current?.clientEl;
    setNodes(el ? el.querySelectorAll('*').length : 0);
  }, []);

  const updateStats = useCallback((state?: any) => {
    const runs = runsRef.current;
    const lead = runs.reduce((max, r) => Math.max(max, r.step), 0);
    setStats(
      formatAiStats({
        total: listRef.current.length,
        streaming: runs.length > 0,
        atBottom: atBottomRef.current,
        step: runs.length > 0 ? { done: lead, total: SCRIPT.length } : undefined,
        nodes,
        state,
        loadState: loadStateRef.current,
      }),
    );
  }, [nodes]);

  const onLoadMore = useCallback(async (direction: LoadDirection) => {
    if (direction !== 'top') return false;
    const older = await fetchAiPage(pageRef.current - 1, PAGE_SIZE);
    pageRef.current -= 1;
    setList((prev) => older.concat(prev));
    return pageRef.current > 1;
  }, []);

  /** 把生成中的块推到 state，让界面看见这一帧的变化 */
  const publish = useCallback(() => {
    const runs = runsRef.current;
    const blocks: Record<number, AgentBlock[]> = {};
    for (const run of runs) blocks[run.msgId] = run.blocks;
    setLive({
      blocks,
      count: runs.length,
      lead: runs.reduce((max, r) => Math.max(max, r.step), 0),
    });
  }, []);

  /** 一条回答收尾：块落回 list，补上统计 */
  const finish = useCallback(
    (run: Run, aborted = false) => {
      let blocks = run.blocks;

      if (aborted) {
        // 中途停止时可能有一张卡还在转，落成「已取消」——既不是成功也不是失败，
        // 但绝不能留一个永远转下去的图标
        const last = blocks[blocks.length - 1];
        if (last?.kind === 'tool' && last.status === 'running') {
          blocks = [...blocks.slice(0, -1), { ...last, status: 'aborted' }];
        } else if (last?.kind === 'chart' && last.loading) {
          blocks = [...blocks.slice(0, -1), { ...last, loading: false }];
        }
      }

      const ms = Math.round(performance.now() - run.startedAt);
      // 展示用的估算值，按内容长度折算，不追求和真实分词一致
      const tokens = Math.round(blocksToPlainText(blocks).length / 1.4);

      // 生成期间一次没动过 list，这是唯一一次重建数组
      setList((prev) =>
        prev.map((m) => (m.id === run.msgId ? { ...m, blocks, streaming: false, ms, tokens } : m)),
      );

      runsRef.current = runsRef.current.filter((r) => r !== run);
      publish();
    },
    [publish],
  );

  /**
   * 推进一条回答一帧。
   *
   * 一次回答里有两种完全不同的更新，这个函数把它们分开：
   *
   * - **插入一个块**（思考、工具卡、代码块、图表、来源）——一次高度跳变，结构变了；
   * - **往块里追加一片文本**——只换最后一个块的引用，高度连续增长。
   *
   * 前者故意单独占一帧，好让读者看清跳变发生的那一刻跟随是否稳定。
   */
  const advance = useCallback((run: Run) => {
    const step = SCRIPT[run.step];
    if (!step) return;

    if (!run.opened) {
      run.blocks = [...run.blocks, stepToBlock(step)];
      run.chunks = sliceIntoChunks(stepText(step));
      run.hold = stepHoldFrames(step);
      run.chunk = 0;
      run.opened = true;
      return;
    }

    const last = run.blocks[run.blocks.length - 1]!;

    if (run.chunk < run.chunks.length) {
      // 只换最后一个块：前面的块引用不变，memo 会跳过它们
      run.blocks = [...run.blocks.slice(0, -1), blockWithChunk(last, run.chunks[run.chunk]!)];
      run.chunk += 1;
      return;
    }

    // 工具卡与图表多停几帧再落地，让「执行中」「正在算」这两个状态看得见
    if (run.hold > 0) {
      run.hold -= 1;
      return;
    }

    run.blocks = [...run.blocks.slice(0, -1), blockSettled(last, step)];
    run.step += 1;
    run.opened = false;
  }, []);

  const tick = useCallback(() => {
    for (const run of [...runsRef.current]) {
      if (run.step >= SCRIPT.length) finish(run);
      else advance(run);
    }
    publish();

    if (runsRef.current.length === 0 && timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [advance, finish, publish]);

  const tickRef = useRef(tick);
  tickRef.current = tick;

  const startRun = useCallback(
    (msgId: number) => {
      runsRef.current = [
        ...runsRef.current,
        {
          msgId,
          step: 0,
          chunk: 0,
          chunks: [],
          hold: 0,
          opened: false,
          startedAt: performance.now(),
          blocks: [],
        },
      ];
      publish();
      // 定时器闭包里读 ref，避免把 tick 的每次新引用都绑进去
      timerRef.current ??= window.setInterval(() => tickRef.current(), TICK);
    },
    [publish],
  );

  const stopAll = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    for (const run of [...runsRef.current]) finish(run, true);
  }, [finish]);

  /**
   * 提问。
   *
   * 生成过程中再问一次不会被拦住——两条回答会同时生成，
   * 这正是真实 agent 界面的样子，也是对跟随更狠的一档：
   * 同一帧里有两项在变高，而它们未必都在视口里。
   */
  const ask = useCallback(
    (question: string) => {
      const base = listRef.current.length;
      const q = createAiMessage(base, 'user', question);
      const a = createAiMessage(base + 1, 'assistant', '', true);
      setList((prev) => [...prev, q, a]);
      startRun(a.id);
    },
    [startRun],
  );

  /**
   * 重新生成某条回答。
   *
   * 清空 blocks 会让这一项的高度从几百像素骤降到几十像素——比追加内容更极端的
   * 一种变化。贴底时视口应当立刻收回到新的内容末端，不该留一片空白。
   */
  const retry = useCallback(
    (msg: AiMessage) => {
      if (runsRef.current.some((r) => r.msgId === msg.id)) return;
      setList((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, blocks: [], streaming: true } : m)),
      );
      startRun(msg.id);
    },
    [startRun],
  );

  const toggleBlock = useCallback((key: string) => {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const like = useCallback((id: number) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => () => {
    if (timerRef.current !== null) clearInterval(timerRef.current);
  }, []);

  const phase =
    live.count === 0
      ? '空闲'
      : live.count > 1
        ? `${live.count} 条回答同时生成中`
        : (PHASE_TEXT[SCRIPT[live.lead]?.type ?? 'text'] ?? '收尾');

  return (
    <div className="demo-panel">
      <div className="demo-stats">{stats}</div>
      <AgentShell
        live={live.count > 0}
        model={MODEL_NAME}
        phase={phase}
        steps={{ done: live.lead, total: SCRIPT.length }}
        quickAsks={QUICK_ASKS}
        onSend={ask}
        onStop={stopAll}
        toolbar={
          <button
            type="button"
            className="virt-list-btn"
            disabled={atBottom}
            onClick={() => vlRef.current?.scrollToBottom()}
          >
            {pendingNew > 0 ? `回到底部（${pendingNew} 条新消息）` : '回到底部'}
          </button>
        }
      >
        <div className="demo-list-container">
          <VirtList<AiMessage>
            ref={vlRef}
            list={list}
            itemKey="id"
            estimatedSize={200}
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
            onUpdate={(_, state) => {
              updateStats(state);
              countNodes();
            }}
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
              // 正在生成的那条读 liveBlocks，其余读 list 里的定稿
              const blocks = live.blocks[itemData.id];
              return (
                <AgentMessage
                  message={blocks ? { ...itemData, blocks } : itemData}
                  streaming={!!blocks}
                  expanded={expandedBlocks}
                  liked={likedIds.has(itemData.id)}
                  onToggleBlock={toggleBlock}
                  onRetry={retry}
                  onLike={like}
                />
              );
            }}
          </VirtList>
        </div>
      </AgentShell>
    </div>
  );
}
