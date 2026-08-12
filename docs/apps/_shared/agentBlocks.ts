/**
 * Agent 消息的「块」模型，五个框架共用。
 *
 * 真实的 agent 界面里，一条回答不是一段文本，而是若干形态不同的块拼起来的：
 * 思考过程、工具调用、正文、代码块、来源引用。这件事对虚拟列表的意义在于两点——
 *
 * 1. **项高度的分布被彻底拉开**：一条纯文本回答几十像素，一条带工具卡和代码块的
 *    回答六七百像素，预估值对谁都不准，只能靠测量。
 * 2. **流式过程中会「中途插块」**：同一个块内追加文本，高度是连续增长的；
 *    而插入一张工具卡是一次跳变。两者对跟随的压力不同，示例要把它们都演出来。
 *
 * 这个文件只放模型、造数据与纯函数序列化；「怎么把块喂进列表」是各框架示例
 * 自己的事（那正是示例要教的东西）。
 */

/** `aborted` 是用户中途停止生成留下的状态——它既不是成功也不是失败 */
export type ToolStatus = 'queued' | 'running' | 'ok' | 'error' | 'aborted';

/** 工具输出的呈现方式：终端回显、统一 diff、或普通文本 */
export type ToolOutputKind = 'terminal' | 'diff' | 'text';

export interface AgentTextBlock {
  kind: 'text';
  text: string;
}

export interface AgentCodeBlock {
  kind: 'code';
  lang: string;
  code: string;
}

export interface AgentThinkingBlock {
  kind: 'thinking';
  text: string;
  /** 展示成「思考 12s」 */
  seconds: number;
  expanded: boolean;
}

export interface AgentSource {
  title: string;
  site: string;
  snippet: string;
}

export interface AgentSourcesBlock {
  kind: 'sources';
  items: AgentSource[];
}

/**
 * 图表块。
 *
 * 它存在的理由和别的块不同：**加载完成的时机不由你掌握**。
 * agent 先给出一个占位，数据算完（或图片下载完）才铺开成一张图——
 * 高度在某个你没法预测的时刻突然涨一百多像素。文本流式至少是连续的，
 * 这一类不是，所以它是 ResizeObserver 存在的最好理由。
 */
export interface AgentChartBlock {
  kind: 'chart';
  title: string;
  unit: string;
  /** true 时只占一行骨架，false 时铺开成完整图表 */
  loading: boolean;
  items: { label: string; value: number }[];
}

export interface AgentToolBlock {
  kind: 'tool';
  name: string;
  /** 参数摘要，显示在卡片标题右侧 */
  args: string;
  status: ToolStatus;
  ms: number;
  outputKind: ToolOutputKind;
  output: string;
  expanded: boolean;
}

export type AgentBlock =
  | AgentTextBlock
  | AgentCodeBlock
  | AgentThinkingBlock
  | AgentSourcesBlock
  | AgentChartBlock
  | AgentToolBlock;

/* ===================================================================
 * 造数据
 *
 * 设定统一：agent 正在帮你修 virt-list 自己的滚动抖动问题。示例里出现的文件名、
 * 命令、报错都取自这个仓库，读者一眼能看出这是真实开发流程而不是占位文本。
 * =================================================================== */

const THINKINGS: { text: string; seconds: number }[] = [
  {
    text:
      '用户说流式输出时列表会抖。抖动通常来自两处：一是尺寸变化后按差值补偿滚动偏移，' +
      '误差会逐次累积；二是补偿自身又触发滚动事件，与用户输入分不清来源。\n' +
      '先读核心里待维持目标那一段，确认它是每次重新求解还是累加增量。',
    seconds: 12,
  },
  {
    text:
      '报错在类型检查阶段，不是运行时。先看 tsconfig 的 strict 配置，' +
      '再确认是不是 workspace 链接没建立导致取到了旧的类型声明。',
    seconds: 6,
  },
  {
    text:
      '测试失败集中在滚动补偿一块，怀疑尺寸缓存没有失效。\n' +
      '分块索引里单项尺寸变化只该失效它所在的那一块，先验证这个前提是否成立。',
    seconds: 9,
  },
];

const TOOL_TEMPLATES: Omit<AgentToolBlock, 'kind' | 'status' | 'expanded'>[] = [
  {
    name: 'read_file',
    args: 'packages/core/src/VirtListCore.ts',
    ms: 42,
    outputKind: 'text',
    output:
      '共 1779 行，已读取 1-120 与 640-820 两段。\n' +
      '待维持目标定义在 _pendingAnchor，求解入口是 _solveAnchor()，' +
      '在每次尺寸上报后调用一次，不做增量累加。',
  },
  {
    name: 'grep',
    args: "pattern='stickyBottom' glob='**/*.ts'",
    ms: 88,
    outputKind: 'terminal',
    output:
      '$ rg -n "stickyBottom" --glob "**/*.ts"\n' +
      'packages/core/src/types.ts:300:  stickyBottom?: boolean;\n' +
      'packages/core/src/VirtListCore.ts:812:    if (!this.props.stickyBottom) return;\n' +
      'packages/core/src/VirtListCore.ts:834:      this._pendingAnchor = { type: "bottom" };\n' +
      'packages/vanilla/src/VirtList.ts:207:      stickyBottom: false,\n' +
      '4 matches across 3 files',
  },
  {
    name: 'bash',
    args: 'pnpm vitest run --reporter=dot',
    ms: 8460,
    outputKind: 'terminal',
    output:
      '$ pnpm vitest run --reporter=dot\n' +
      '......................................................\n' +
      '......................................................\n' +
      ' Test Files  38 passed (38)\n' +
      '      Tests  900 passed (900)\n' +
      '   Duration  8.46s',
  },
  {
    name: 'edit_file',
    args: 'packages/core/src/VirtListCore.ts',
    ms: 15,
    outputKind: 'diff',
    output:
      '@@ -812,9 +812,11 @@ class VirtListCore {\n' +
      '   private _onSizeChange(key: string, size: number) {\n' +
      '     this._sizes.set(key, size);\n' +
      '-    // 按差值补偿：误差会累积，且补偿本身触发新的滚动事件\n' +
      '-    this._scrollTop += size - (this._lastSize.get(key) ?? size);\n' +
      '+    // 重新求解待维持目标：幂等，不依赖上一次的结果\n' +
      '+    this._solveAnchor();\n' +
      '     this._lastSize.set(key, size);\n' +
      '   }',
  },
  {
    name: 'bash',
    args: 'pnpm typecheck',
    ms: 5210,
    outputKind: 'terminal',
    output:
      '$ pnpm typecheck\n' +
      "docs/apps/vue2/src/components/ai/AiStreaming.vue(84,7): error TS2322: Type 'false' is not assignable to type 'true'.\n" +
      ' ELIFECYCLE  Command failed with exit code 1.',
  },
  {
    name: 'web_search',
    args: 'ResizeObserver 回调时序 与 滚动补偿',
    ms: 1240,
    outputKind: 'text',
    output: '返回 3 条结果，已按相关度排序，摘要见下方来源卡片。',
  },
];

const CODE_SAMPLES: { lang: string; code: string }[] = [
  {
    lang: 'ts',
    code:
      '// 把「视觉上该维持什么」表达成目标，而不是一串增量补偿\n' +
      'private _solveAnchor() {\n' +
      '  const anchor = this._pendingAnchor;\n' +
      '  if (anchor.type === "bottom") {\n' +
      '    this._setOffset(this._totalSize() - this._viewportSize());\n' +
      '    return;\n' +
      '  }\n' +
      '  // 锚定某一项的顶边：前缀和一变，这里自然跟着变\n' +
      '  this._setOffset(this._offsetOf(anchor.key) - anchor.delta);\n' +
      '}',
  },
  {
    lang: 'ts',
    code:
      '// 流式追加：只改最后一个块的文本，列表结构与其他项的 DOM 一概不动\n' +
      'function appendChunk(chunk: string) {\n' +
      '  const msg = list.value[list.value.length - 1];\n' +
      '  const block = msg?.blocks[msg.blocks.length - 1];\n' +
      '  if (block?.kind === "text") block.text += chunk;\n' +
      '}',
  },
];

/** 示例数据，不是实测值——图表块要演示的是「高度突变」，数字本身只要同量级即可 */
const CHART_SETS: Omit<AgentChartBlock, 'kind' | 'loading'>[] = [
  {
    title: '各包 gzip 后体积',
    unit: 'KB',
    items: [
      { label: 'core', value: 6.1 },
      { label: 'vanilla', value: 7.4 },
      { label: 'vue', value: 4.2 },
      { label: 'react', value: 4.6 },
      { label: 'vue2', value: 4.3 },
    ],
  },
  {
    title: '一万项滚动时的平均帧耗时',
    unit: 'ms',
    items: [
      { label: '改动前', value: 14.2 },
      { label: '改动后', value: 6.8 },
      { label: '空列表基线', value: 5.9 },
    ],
  },
];

const SOURCE_SETS: AgentSource[][] = [
  [
    {
      title: 'ResizeObserver: observe() 与回调时序',
      site: 'developer.mozilla.org',
      snippet: '回调在布局之后、绘制之前触发，同一帧内的多次尺寸变化会被合并上报。',
    },
    {
      title: 'Element 高度上限与滚动精度',
      site: 'bugs.chromium.org',
      snippet: '不同引擎的元素高度上限在几百万到几千万像素之间，超出后滚动条失去精度。',
    },
    {
      title: 'CSS transform 不触发重排',
      site: 'web.dev',
      snippet: 'transform 只参与合成，位移用它表达可以避开逐帧重排。',
    },
  ],
];

/* ===================================================================
 * 块级工厂
 *
 * 所有可变字段（expanded / status / ms）都在这里写死初值。
 * 理由见 traceData.ts 的同类注释：Vue 2 的响应式侦测不到「创建之后才出现」
 * 的属性，字段缺失的话点展开不会有任何反应，而五个框架共用同一份造数据。
 * =================================================================== */

export function makeText(text: string): AgentTextBlock {
  return { kind: 'text', text };
}

export function makeCode(seed: number): AgentCodeBlock {
  const sample = CODE_SAMPLES[seed % CODE_SAMPLES.length]!;
  return { kind: 'code', lang: sample.lang, code: sample.code };
}

export function makeThinking(seed: number): AgentThinkingBlock {
  const t = THINKINGS[seed % THINKINGS.length]!;
  return { kind: 'thinking', text: t.text, seconds: t.seconds, expanded: false };
}

export function makeSources(seed: number): AgentSourcesBlock {
  return { kind: 'sources', items: SOURCE_SETS[seed % SOURCE_SETS.length]! };
}

/** `loading` 由调用方决定：历史消息里是画好的图，流式演出里先占位再铺开 */
export function makeChart(seed: number, loading = false): AgentChartBlock {
  const set = CHART_SETS[seed % CHART_SETS.length]!;
  return { kind: 'chart', title: set.title, unit: set.unit, loading, items: set.items };
}

/**
 * 造一张工具卡。
 *
 * `status` 由调用方决定：历史消息里是终态（成功或失败），流式演出里先以
 * `running` 插入、跑完再落终态——这正是「同一张卡的高度会变两次」的来源。
 */
export function makeTool(seed: number, status: ToolStatus = 'ok'): AgentToolBlock {
  const t = TOOL_TEMPLATES[seed % TOOL_TEMPLATES.length]!;
  // 输出里带 error / exit code 的模板，终态自然是失败
  const failed = t.output.includes('error TS') || t.output.includes('exit code 1');
  return {
    kind: 'tool',
    name: t.name,
    args: t.args,
    status: status === 'ok' && failed ? 'error' : status,
    ms: t.ms,
    outputKind: t.outputKind,
    output: t.output,
    expanded: false,
  };
}

/** 一条 assistant 回答由哪些块组成——按 seed 稳定生成，不用随机数 */
export function makeAnswerBlocks(seed: number, text: string): AgentBlock[] {
  const blocks: AgentBlock[] = [];

  // 每三条带一次思考过程，每两条带一次工具调用：让高度分布接近真实会话
  if (seed % 3 === 0) blocks.push(makeThinking(seed));
  if (seed % 2 === 0) blocks.push(makeTool(seed));

  blocks.push(makeText(text));

  if (seed % 3 === 1) blocks.push(makeCode(seed));
  if (seed % 5 === 2) blocks.push(makeChart(seed));
  if (seed % 7 === 3) blocks.push(makeSources(seed));

  return blocks;
}

/* ===================================================================
 * 序列化
 * =================================================================== */

const STATUS_LABEL: Record<ToolStatus, string> = {
  queued: '排队中',
  running: '执行中',
  ok: '成功',
  error: '失败',
  aborted: '已取消',
};

export function toolStatusLabel(status: ToolStatus): string {
  return STATUS_LABEL[status];
}

/** 工具耗时的人读形式：8460 → 8.5s，42 → 42ms */
export function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

/** token 数的人读形式：1240 → 1.2k */
export function formatTokens(tokens: number): string {
  return tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens);
}

/**
 * 块 → 纯文本，用于搜索与统计。
 *
 * 思考块不计入：界面上它默认是折叠的，把它算进命中会让读者搜到看不见的东西。
 */
export function blocksToPlainText(blocks: AgentBlock[]): string {
  return blocks
    .map((b) => {
      if (b.kind === 'text') return b.text;
      if (b.kind === 'code') return b.code;
      if (b.kind === 'tool') return `${b.name}(${b.args})`;
      if (b.kind === 'sources') return b.items.map((s) => s.title).join('\n');
      if (b.kind === 'chart') return b.title;
      return '';
    })
    .filter(Boolean)
    .join('\n\n');
}

/**
 * 只取正文块的文本，用于搜索。
 *
 * 命中与高亮必须基于同一份文本：如果命中算进了代码块和工具参数，
 * 而高亮只画在正文上，读者会看到「说命中了却找不到黄色」的怪事。
 */
export function blocksToSearchText(blocks: AgentBlock[]): string {
  return blocks
    .filter((b): b is AgentTextBlock => b.kind === 'text')
    .map((b) => b.text)
    .join('\n');
}

/**
 * 块 → Markdown，用于复制。
 *
 * 复制示例要证明的事情是「跨越未渲染项的选区也能拿到完整内容」，
 * 那么拿到的内容就该是能直接粘进编辑器的形态：代码带围栏、工具调用带状态、
 * 思考过程折叠成一行摘要。
 */
export function blocksToMarkdown(blocks: AgentBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.kind) {
        case 'text':
          return b.text;
        case 'code':
          return `\`\`\`${b.lang}\n${b.code}\n\`\`\``;
        case 'thinking':
          return `> 思考 ${b.seconds}s（已折叠）`;
        case 'tool':
          return `- ${b.name}(${b.args}) → ${toolStatusLabel(b.status)} · ${formatMs(b.ms)}`;
        case 'sources':
          return b.items.map((s) => `- [${s.title}](${s.site})`).join('\n');
        case 'chart':
          // 图表复制成表格：粘到工单里还能读，这是图形本身做不到的
          return [
            `**${b.title}**`,
            '',
            `| | ${b.unit} |`,
            '| --- | --- |',
            ...b.items.map((it) => `| ${it.label} | ${it.value} |`),
          ].join('\n');
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join('\n\n');
}

/* ===================================================================
 * 流式演出脚本
 * =================================================================== */

export type StreamStep =
  | { type: 'thinking'; seed: number }
  | { type: 'tool'; seed: number }
  | { type: 'text'; text: string }
  | { type: 'code'; seed: number }
  | { type: 'chart'; seed: number }
  | { type: 'sources'; seed: number };

const ANSWER_PART_1 =
  '抖动的根源**不在渲染，在滚动**。我读了核心里处理尺寸变化的那一段，' +
  '确认它没有按差值累加偏移，而是每次重新求解一个待维持目标——所以这一层是对的。';

const ANSWER_PART_2 =
  '## 问题在调用侧\n\n' +
  '每个 token 都重建了一次列表数据。重建会让整条链路重算区间与尺寸索引，' +
  '而这些计算在同一帧内的结果是等价的；白算之外，它还会让测量与求解交错，看起来就是抖。\n\n' +
  '两种更新要分开写：\n' +
  '- **块内追加**：每秒几十次，只改 `block.text` 一个属性；\n' +
  '- **插入新块**：一次回答里只有几次，动的是 `blocks` 数组的结构。\n\n' +
  '上面那段代码就是最小改法。插入工具卡这类结构变化是一次跳变，' +
  '跟随会在下一次求解里吸收掉，你不需要额外做什么。';

/**
 * 一次完整回答的演出脚本。
 *
 * 顺序刻意安排成「思考 → 工具 → 正文 → 代码 → 工具 → 正文 → 来源」：
 * 文本块内追加是连续增高，插入工具卡与代码块是跳变，两种情形在一次演示里都出现，
 * 而且插块发生在**用户可能已经上滑**之后，正好检验跟随的建立与解除。
 */
export function buildAnswerScript(): StreamStep[] {
  return [
    { type: 'thinking', seed: 0 },
    { type: 'tool', seed: 0 },
    { type: 'text', text: ANSWER_PART_1 },
    { type: 'code', seed: 1 },
    { type: 'tool', seed: 2 },
    { type: 'text', text: ANSWER_PART_2 },
    // 图表先占一行骨架，几帧之后才铺开——一次没有预告的高度突变
    { type: 'chart', seed: 1 },
    { type: 'sources', seed: 0 },
  ];
}

/** 把一个步骤变成初始状态的块：工具卡以 running 插入，其余从空文本开始 */
export function stepToBlock(step: StreamStep): AgentBlock {
  switch (step.type) {
    case 'thinking':
      return { ...makeThinking(step.seed), text: '' };
    case 'tool':
      return makeTool(step.seed, 'running');
    case 'code':
      return { ...makeCode(step.seed), code: '' };
    case 'chart':
      return makeChart(step.seed, true);
    case 'sources':
      return makeSources(step.seed);
    case 'text':
    default:
      return makeText('');
  }
}

/** 这一步要逐片打出来的文本；工具卡与来源是瞬时块，返回空串 */
export function stepText(step: StreamStep): string {
  switch (step.type) {
    case 'thinking':
      return makeThinking(step.seed).text;
    case 'code':
      return makeCode(step.seed).code;
    case 'text':
      return step.text;
    default:
      return '';
  }
}

/**
 * 往块里追加一片文本。
 *
 * 只改一个属性——这是流式该有的开销。注意传进来的必须是**列表里那个对象**
 * （Vue 下是 Proxy），不是造数据时的原始对象。
 */
export function appendToBlock(block: AgentBlock, chunk: string): void {
  if (block.kind === 'text' || block.kind === 'thinking') block.text += chunk;
  else if (block.kind === 'code') block.code += chunk;
}

/**
 * `appendToBlock` 的不可变版本，供 React 使用。
 *
 * React 下「只更新最后一个块」靠的是引用：换掉最后一个块、保持前面的不动，
 * 前面那些块的 memo 就会整个跳过。原地改属性在 React 里根本看不见。
 */
export function blockWithChunk(block: AgentBlock, chunk: string): AgentBlock {
  if (block.kind === 'text' || block.kind === 'thinking') {
    return { ...block, text: block.text + chunk };
  }
  if (block.kind === 'code') return { ...block, code: block.code + chunk };
  return block;
}

/** `settleBlock` 的不可变版本 */
export function blockSettled(block: AgentBlock, step: StreamStep): AgentBlock {
  if (block.kind === 'tool' && step.type === 'tool') {
    return { ...block, status: makeTool(step.seed, 'ok').status };
  }
  if (block.kind === 'chart' && step.type === 'chart') return { ...block, loading: false };
  return block;
}

/**
 * 一步演完的落地动作：
 * - 工具卡从 running 落到终态（成功或失败由模板决定）；
 * - 图表从骨架铺开成完整图形，高度在这一帧涨一百多像素。
 */
export function settleBlock(block: AgentBlock, step: StreamStep): void {
  if (block.kind === 'tool' && step.type === 'tool') {
    block.status = makeTool(step.seed, 'ok').status;
  } else if (block.kind === 'chart' && step.type === 'chart') {
    block.loading = false;
  }
}

/** 这一步在落地前要「跑」多少帧——耗时长的命令多停几帧，看得出执行中的状态 */
export function stepHoldFrames(step: StreamStep): number {
  if (step.type === 'chart') return 10;
  if (step.type !== 'tool') return 0;
  return makeTool(step.seed).ms >= 1000 ? 12 : 4;
}
