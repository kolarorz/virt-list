/**
 * 示例顶部那行状态文本的拼装，五个框架共用。
 *
 * 抽出来的理由同 chatData：它是给读者看内部状态的辅助信息，不是示例主题本身。
 */

/** update 事件里那个 state，这里只读用得上的几个字段 */
export interface ListStateLike {
  inViewBegin?: number;
  inViewEnd?: number;
  renderBegin?: number;
  renderEnd?: number;
  /** 所有项的尺寸总和，除以项数就是平均项高——用来校准 estimatedSize */
  itemsTotalSize?: number;
}

/** 加载状态，只读用得上的几个字段 */
export interface LoadStateLike {
  loadingTop?: boolean;
  loadingBottom?: boolean;
  pendingNew?: number;
}

export interface ChatStatsInput {
  total: number;
  /** 已展开的条数（折叠示例专用，不传就不显示） */
  expanded?: number;
  state?: ListStateLike;
  loadState?: LoadStateLike | null;
}

/**
 * 拼出形如
 * `总数: 30 | 已展开: 2 | 可视区域: 20 - 24 | 渲染区间: 20 - 24 | 3 条新消息`
 * 的一行文本。
 */
export function formatChatStats({
  total,
  expanded,
  state,
  loadState,
}: ChatStatsInput): string {
  const parts = [`总数: ${total}`];
  if (expanded !== undefined) parts.push(`已展开: ${expanded}`);

  parts.push(
    `可视区域: ${state?.inViewBegin ?? '-'} - ${state?.inViewEnd ?? '-'}`,
    `渲染区间: ${state?.renderBegin ?? '-'} - ${state?.renderEnd ?? '-'}`,
  );

  if (loadState?.loadingTop || loadState?.loadingBottom) parts.push('加载中...');
  const pending = loadState?.pendingNew ?? 0;
  if (pending > 0) parts.push(`${pending} 条新消息`);

  return parts.join(' | ');
}

export interface AiStatsInput {
  total: number;
  /** 是否正在流式生成 */
  streaming: boolean;
  /** 视口是否贴底（即是否处于跟随态） */
  atBottom: boolean;
  /** 生成过程走到第几步（演出脚本的进度），不传则不显示 */
  step?: { done: number; total: number };
  /**
   * 当前渲染区间里的 DOM 节点总数。
   *
   * 富消息（代码块、工具卡、来源卡片）让单项的节点数从个位数涨到几十个，
   * 把这个数字摆出来，读者才能判断「渲染池只有几十项」在自己的内容下意味着什么。
   */
  nodes?: number;
  state?: ListStateLike;
  loadState?: LoadStateLike | null;
}

/**
 * AI 对话示例的状态行。
 *
 * 比 formatChatStats 多两个字段：流式输出与贴底跟随是这类场景里最容易出错的
 * 两件事，把它们直接显示出来，读者滚动几下就能看清跟随是怎么建立和解除的。
 */
export function formatAiStats({
  total,
  streaming,
  atBottom,
  step,
  nodes,
  state,
  loadState,
}: AiStatsInput): string {
  const parts = [
    `消息数: ${total}`,
    streaming ? '生成中' : '空闲',
    atBottom ? '跟随中' : '已脱离跟随',
    `可视区域: ${state?.inViewBegin ?? '-'} - ${state?.inViewEnd ?? '-'}`,
  ];

  if (step) parts.splice(2, 0, `第 ${step.done}/${step.total} 步`);

  // 平均项高只有在量过一些项之后才有意义，未测量的项按预估值计入
  const avg = state?.itemsTotalSize && total > 0 ? Math.round(state.itemsTotalSize / total) : 0;
  if (avg > 0) parts.push(`平均项高: ${avg}px`);
  if (nodes !== undefined && nodes > 0) parts.push(`DOM 节点: ${nodes}`);

  if (loadState?.loadingTop) parts.push('加载历史中...');

  return parts.join(' | ');
}
