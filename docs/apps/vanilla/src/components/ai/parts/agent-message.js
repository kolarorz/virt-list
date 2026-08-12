import {
  blocksToMarkdown,
  formatMs,
  formatTokens,
} from '../../../../../_shared/agentBlocks';
import { splitByKeyword } from '../../../../../_shared/highlight';
import { parseMarkdown } from '../../../../../_shared/markdown';

/**
 * Agent 消息的命令式渲染，vanilla 版示例共用。
 *
 * 和框架版的差别只在「谁来把数据变成 DOM」：这里全是手写的 createElement，
 * 好处是能精确控制更新范围——流式生成时只重建**最后一个块**的 DOM，
 * 消息里其他块、列表里其他项一个节点都不动（见 syncLastBlock）。
 *
 * ctx 里可以给：
 * - streaming: 这条是否正在生成（决定挂不挂光标）
 * - keyword / currentHit: 搜索用
 * - expandedOf(blockIndex): 这个块是否展开，不传则读 block.expanded
 * - onToggle(blockIndex) / onRetry(msg) / onLike(msg)
 */

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** 执行中的圆、成功的勾、失败的叉、取消的斜杠——转起来的只有第二个 */
const STATUS_ICON = {
  queued: '○',
  running: '◐',
  ok: '✓',
  error: '✗',
  aborted: '⊘',
};

const LINE_CLASS = {
  para: 'demo-agent-md-p',
  bullet: 'demo-agent-md-li',
  ordered: 'demo-agent-md-li',
  quote: 'demo-agent-md-quote',
};

function lineClass(line) {
  if (line.kind === 'heading') return `demo-agent-md-h${line.level}`;
  return LINE_CLASS[line.kind] ?? 'demo-agent-md-p';
}

function termClass(line) {
  if (line.startsWith('$')) return ' is-cmd';
  if (/error|FAIL|failed|exit code|超时/i.test(line)) return ' is-fail';
  if (/passed|通过|Duration/.test(line)) return ' is-pass';
  return '';
}

function diffClass(line) {
  if (line.startsWith('@@')) return ' is-hunk';
  if (line.startsWith('+')) return ' is-add';
  if (line.startsWith('-')) return ' is-del';
  return '';
}

/**
 * 工具输出：终端回显或统一 diff。
 *
 * 不做语法高亮——示例本身是性能演示，为了给输出上色而引一个高亮器
 * （连主题带语法约 60KB gzip）不合适。按行做几个廉价判断，观感已经足够。
 * Agent 执行流示例也用这个函数，两处的着色规则因此完全一致。
 */
export function renderOutput(text, kind) {
  if (kind === 'text') return el('pre', 'demo-agent-term', text);

  const pre = el('pre', kind === 'diff' ? 'demo-agent-diff' : 'demo-agent-term');
  for (const line of text.split('\n')) {
    const cls =
      kind === 'diff'
        ? `demo-agent-diff-line${diffClass(line)}`
        : `demo-agent-term-line${termClass(line)}`;
    pre.appendChild(el('div', cls, line || ' '));
  }
  return pre;
}

function renderMarkdown(text, streaming) {
  const wrap = el('div', 'demo-agent-md');
  const lines = parseMarkdown(text);

  // 光标挂在最后一个非空行上，否则流式遇到空行时它会孤零零地跳到下一段
  let lastLine = 0;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (lines[i].kind !== 'blank') {
      lastLine = i;
      break;
    }
  }

  lines.forEach((line, i) => {
    if (line.kind === 'blank') {
      wrap.appendChild(el('div', 'demo-agent-md-gap'));
      return;
    }

    const row = el('div', lineClass(line));
    if (line.marker) row.appendChild(el('span', 'demo-agent-md-marker', line.marker));

    const body = el('span');
    for (const span of line.spans) {
      if (span.kind === 'strong') body.appendChild(el('strong', '', span.text));
      else if (span.kind === 'code') body.appendChild(el('code', 'demo-agent-inline-code', span.text));
      else body.appendChild(el('span', '', span.text));
    }
    if (streaming && i === lastLine) body.appendChild(el('span', 'demo-ai-caret'));

    row.appendChild(body);
    wrap.appendChild(row);
  });

  return wrap;
}

/** 搜索路径：按命中分段，显示 Markdown 的原始标记，命中与高亮的位置才对得上 */
function renderHighlighted(text, keyword, currentHit) {
  const wrap = el('div', 'demo-agent-text');
  for (const part of splitByKeyword(text, keyword)) {
    if (part.hit) {
      wrap.appendChild(el('mark', `demo-hit${currentHit ? ' is-current' : ''}`, part.text));
    } else {
      wrap.appendChild(el('span', '', part.text));
    }
  }
  return wrap;
}

function renderCode(block) {
  const wrap = el('div', 'demo-agent-code');

  const head = el('div', 'demo-agent-code-head');
  head.appendChild(el('span', '', block.lang));
  const copy = el('button', 'demo-agent-code-copy', '⧉ 复制');
  copy.type = 'button';
  copy.addEventListener('click', () => {
    navigator.clipboard?.writeText(block.code);
    copy.textContent = '已复制';
    setTimeout(() => {
      copy.textContent = '⧉ 复制';
    }, 1200);
  });
  head.appendChild(copy);
  wrap.appendChild(head);

  const body = el('pre', 'demo-agent-code-body');
  for (const line of block.code.split('\n')) {
    const isComment = line.trimStart().startsWith('//');
    body.appendChild(el('div', `demo-agent-code-line${isComment ? ' is-comment' : ''}`, line || ' '));
  }
  wrap.appendChild(body);

  return wrap;
}

function renderChart(chart) {
  // 还在算：只占一行，铺开时高度会突然涨一百多像素
  if (chart.loading) {
    const wrap = el('div', 'demo-agent-chart is-loading');
    const skeleton = el('div', 'demo-agent-skeleton');
    skeleton.appendChild(el('span', '', chart.title));
    skeleton.appendChild(el('span', 'demo-agent-skeleton-bar'));
    wrap.appendChild(skeleton);
    return wrap;
  }

  const wrap = el('div', 'demo-agent-chart');

  // 单系列不需要图例：标题就说明了这些条形是什么
  const title = el('div', 'demo-agent-chart-title', chart.title);
  title.appendChild(el('span', 'demo-agent-chart-unit', `（${chart.unit}）`));
  wrap.appendChild(title);

  /** 条长按最大值归一化，不从 0 起画刻度——几条之间的相对关系才是要看的 */
  const max = Math.max(...chart.items.map((i) => i.value), 0.001);

  const rows = el('div', 'demo-agent-chart-rows');
  for (const item of chart.items) {
    const row = el('div', 'demo-agent-chart-row');
    row.title = `${item.label}：${item.value} ${chart.unit}`;
    row.appendChild(el('span', 'demo-agent-chart-label', item.label));

    const track = el('span', 'demo-agent-chart-track');
    const bar = el('span', 'demo-agent-chart-bar');
    bar.style.width = `${Math.max(2, (item.value / max) * 100)}%`;
    track.appendChild(bar);
    row.appendChild(track);

    // 数值直接标出来，用文字色而不是条形的颜色
    row.appendChild(el('span', 'demo-agent-chart-value', String(item.value)));
    rows.appendChild(row);
  }
  wrap.appendChild(rows);

  return wrap;
}

function isExpanded(block, index, ctx) {
  return ctx.expandedOf ? ctx.expandedOf(index) : !!block.expanded;
}

/** 单个块。索引写进 data-block，syncLastBlock 靠它定位 */
export function renderBlock(block, ctx, index) {
  let node;

  if (block.kind === 'text') {
    node = ctx.keyword
      ? renderHighlighted(block.text, ctx.keyword, ctx.currentHit)
      : renderMarkdown(block.text, ctx.streaming);
  } else if (block.kind === 'thinking') {
    node = el('div', 'demo-agent-thinking');
    const open = isExpanded(block, index, ctx);

    const head = el('div', 'demo-agent-thinking-head');
    head.appendChild(el('span', 'demo-agent-caret', open ? '▾' : '▸'));
    head.appendChild(el('span', 'demo-agent-spark', '✦'));
    head.appendChild(el('span', '', `思考 ${block.seconds}s`));
    head.addEventListener('click', () => ctx.onToggle?.(index));
    node.appendChild(head);

    if (open) {
      const body = el('div', 'demo-agent-thinking-body');
      body.appendChild(el('span', '', block.text));
      if (ctx.streaming) body.appendChild(el('span', 'demo-ai-caret'));
      node.appendChild(body);
    }
  } else if (block.kind === 'code') {
    node = renderCode(block);
  } else if (block.kind === 'tool') {
    node = el('div', `demo-agent-tool is-${block.status}`);
    const open = isExpanded(block, index, ctx);

    const head = el('div', 'demo-agent-tool-head');
    head.appendChild(el('span', 'demo-agent-caret', open ? '▾' : '▸'));
    head.appendChild(el('span', 'demo-agent-tool-icon', STATUS_ICON[block.status]));
    head.appendChild(el('span', 'demo-agent-tool-name', block.name));
    head.appendChild(el('span', 'demo-agent-tool-args', block.args));
    const hint =
      block.status === 'running' ? '执行中…' : block.status === 'aborted' ? '已取消' : formatMs(block.ms);
    head.appendChild(el('span', 'demo-agent-tool-ms', hint));
    head.addEventListener('click', () => ctx.onToggle?.(index));
    node.appendChild(head);

    if (open) {
      const body = el('div', 'demo-agent-tool-body');
      body.appendChild(renderOutput(block.output, block.outputKind));
      node.appendChild(body);
    }
  } else if (block.kind === 'chart') {
    node = renderChart(block);
  } else {
    // 来源引用：横向滚动，卡片高度固定
    node = el('div', 'demo-agent-sources');
    for (const source of block.items) {
      const card = el('div', 'demo-agent-source');
      card.appendChild(el('div', 'demo-agent-source-title', source.title));
      card.appendChild(el('div', 'demo-agent-source-site', source.site));
      card.appendChild(el('div', 'demo-agent-source-snippet', source.snippet));
      node.appendChild(card);
    }
  }

  node.dataset.block = String(index);
  return node;
}

function renderActions(msg, ctx) {
  const bar = el('div', 'demo-agent-actions');

  const copy = el('button', 'demo-agent-action', '⧉ 复制');
  copy.type = 'button';
  copy.addEventListener('click', () => {
    // 复制出来是 Markdown：代码带围栏、工具调用带状态，粘到编辑器里就能用
    navigator.clipboard?.writeText(blocksToMarkdown(msg.blocks));
    copy.textContent = '已复制';
    setTimeout(() => {
      copy.textContent = '⧉ 复制';
    }, 1200);
  });
  bar.appendChild(copy);

  const retry = el('button', 'demo-agent-action', '↻ 重试');
  retry.type = 'button';
  retry.addEventListener('click', () => ctx.onRetry?.(msg));
  bar.appendChild(retry);

  const like = el('button', `demo-agent-action${msg.liked ? ' is-active' : ''}`, '♡ 有用');
  like.type = 'button';
  like.addEventListener('click', () => ctx.onLike?.(msg));
  bar.appendChild(like);

  bar.appendChild(
    el('span', 'demo-agent-meta', `${formatTokens(msg.tokens)} tok · ${formatMs(msg.ms)}`),
  );

  return bar;
}

/**
 * 整条消息。
 *
 * 项滚出视口会被回收，滚回来时 renderItem 会再调一次这个函数——读的是数据，
 * 所以离屏期间生成的内容、展开过的工具卡都不会丢。
 */
export function createAgentMessage(msg, ctx = {}) {
  const isUser = msg.role === 'user';
  const row = el(
    'div',
    `demo-agent-msg${isUser ? ' is-user' : ''}${ctx.currentHit ? ' is-current-hit' : ''}`,
  );

  const head = el('div', 'demo-agent-head');
  head.appendChild(el('span', `demo-agent-avatar ${isUser ? 'is-user' : 'is-assistant'}`, isUser ? '你' : '✦'));
  head.appendChild(el('span', 'demo-agent-name', isUser ? '你' : msg.model));
  head.appendChild(el('span', 'demo-agent-time', msg.time));
  if (ctx.index !== undefined) head.appendChild(el('span', 'demo-ai-index', `#${ctx.index}`));
  row.appendChild(head);

  const body = el('div', 'demo-agent-body');
  msg.blocks.forEach((block, i) => body.appendChild(renderBlock(block, ctx, i)));

  // 请求已发出、第一个块还没到：给一条占位，避免界面空着
  if (ctx.streaming && msg.blocks.length === 0) {
    const skeleton = el('div', 'demo-agent-skeleton');
    skeleton.appendChild(el('span', '', '正在思考'));
    skeleton.appendChild(el('span', 'demo-agent-skeleton-bar'));
    body.appendChild(skeleton);
  }

  // 操作栏只在回答完成后出现，生成中露出「复制」会让人复制到半截内容
  if (!isUser && !ctx.streaming && msg.blocks.length > 0) {
    body.appendChild(renderActions(msg, ctx));
  }

  row.appendChild(body);
  return row;
}

/**
 * 把最后一个块的 DOM 同步到数据的当前状态。
 *
 * 流式生成的每一帧都走这里，所以它决定了 vanilla 版的开销：
 * **重建的只有最后一个块**——前面的块、这条消息的头部、列表里其他项都不碰。
 * 框架版能做到只更新一个文本节点，这里退一步到「一个块」，
 * 换来的是不需要任何 diff 机制。
 *
 * 找不到 DOM 说明这条消息此刻在视口外，什么都不用做：数据已经是全文，
 * 滚回来时 renderItem 会照数据重建。
 */
export function syncLastBlock(container, msg, ctx = {}) {
  const row = container.querySelector(`[data-id="${msg.id}"]`);
  const body = row?.querySelector('.demo-agent-body');
  if (!body) return;

  const index = msg.blocks.length - 1;
  if (index < 0) return;

  // 第一个块到了，占位可以撤了
  body.querySelector('.demo-agent-skeleton')?.remove();

  const fresh = renderBlock(msg.blocks[index], ctx, index);
  const old = body.querySelector(`[data-block="${index}"]`);
  if (old) body.replaceChild(fresh, old);
  else body.appendChild(fresh);
}

/** 就地替换某一个块（展开/收起工具卡时用，不必重建整条消息） */
export function syncBlock(container, msg, index, ctx = {}) {
  const row = container.querySelector(`[data-id="${msg.id}"]`);
  const old = row?.querySelector(`.demo-agent-body > [data-block="${index}"]`);
  if (!old) return;
  old.replaceWith(renderBlock(msg.blocks[index], ctx, index));
}
