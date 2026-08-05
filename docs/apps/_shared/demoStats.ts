/**
 * 示例顶部那行状态文本的拼装，五个框架共用。
 *
 * 抽出来的理由同 chatData：它是给读者看内部状态的辅助信息，不是示例主题本身。
 */

/** update 事件里那个 state，这里只读四个字段 */
export interface ListStateLike {
  inViewBegin?: number;
  inViewEnd?: number;
  renderBegin?: number;
  renderEnd?: number;
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
