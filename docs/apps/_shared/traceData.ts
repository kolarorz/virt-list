/**
 * Agent 执行流 / 日志视图的造数据，五个框架共用。
 *
 * 这类视图和聊天列表的差别在于「节奏」：日志是持续高频追加的，一秒十几行很常见，
 * 而且随时可能一次性灌进上万行（切到历史任务、展开一个批处理阶段）。
 *
 * 每行不只是一句文本：工具行带状态、耗时，展开后是终端回显或一段 diff——
 * 于是「一行」和「展开后的一行」高度差着七八倍，这正是日志视图最难的地方。
 */

import type { ToolOutputKind } from './agentBlocks';

export type TraceKind = 'thought' | 'tool' | 'output' | 'error';

/** 行的执行状态。`running` 只出现在正在跑的那一行（恒在末尾） */
export type TraceStatus = 'ok' | 'error' | 'running';

export interface TraceLine {
  id: number;
  /** 行号，界面上显示 */
  seq: number;
  kind: TraceKind;
  text: string;
  /** 工具名，只有 tool 行有意义，其余是空串 */
  tool: string;
  status: TraceStatus;
  /** 这一步的耗时，展示成 42ms / 8.5s */
  ms: number;
  /** 展开后的输出怎么渲染：终端回显、统一 diff、还是普通文本 */
  outputKind: ToolOutputKind;
  /** 折叠起来的详情（工具调用的输入输出），没有则该行不可展开 */
  detail?: string;
  /**
   * 详情是否展开。
   *
   * 造数据时就写死 `false` 而不是留空：Vue 2 的响应式侦测不到「创建之后才出现」
   * 的属性，字段缺失的话点展开不会有任何反应（其余框架没这个限制，
   * 但示例要五个框架共用同一份数据）。
   */
  expanded: boolean;
}

let uid = 0;

const THOUGHTS = [
  '分析用户请求：需要先确认项目使用的包管理器',
  '这个报错来自类型检查阶段，先看 tsconfig 的 strict 配置',
  '测试失败集中在滚动补偿一块，怀疑是尺寸缓存没有失效',
  '需要同时改三处：核心算法、DOM 层的 patch、以及类型定义',
  '先跑一次现有测试建立基线，再动手改',
];

interface ToolTemplate {
  name: string;
  args: string;
  ms: number;
  outputKind: ToolOutputKind;
  /** 输出正文；terminal 的第一行是命令回显，diff 走统一格式 */
  output: string;
}

const TOOLS: ToolTemplate[] = [
  {
    name: 'read_file',
    args: 'packages/core/src/VirtListCore.ts',
    ms: 42,
    outputKind: 'text',
    output:
      '共 1779 行，本次读取 640-820。\n' +
      '待维持目标存在 _pendingAnchor，尺寸上报后调用 _solveAnchor() 重新求解，\n' +
      '没有按差值累加偏移——这一层的实现是对的。',
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
    name: 'list_dir',
    args: 'docs/apps/vanilla/src/components',
    ms: 9,
    outputKind: 'text',
    output:
      'ai/        5 个文件\n' +
      'grid/      2 个文件\n' +
      'list/     20 个文件\n' +
      'tree/     14 个文件',
  },
];

const OUTPUTS = [
  '已定位到 3 处需要修改的位置，开始逐个处理',
  '900 个测试全部通过，用时 8.46s',
  '类型检查通过，没有新增告警',
  '构建产物 gzip 后 6.1KB，与改动前持平',
  '已写入 4 个文件，新增 187 行、删除 23 行',
];

const ERRORS: { text: string; detail: string }[] = [
  {
    text: "命令退出码 1：Type 'false' is not assignable to type 'true'",
    detail:
      '$ pnpm typecheck\n' +
      "docs/apps/vue2/src/components/ai/AiStreaming.vue(84,7): error TS2322:\n" +
      "  Type 'false' is not assignable to type 'true'.\n" +
      ' ELIFECYCLE  Command failed with exit code 1.',
  },
  {
    text: "找不到模块 '@virt-list/core'，检查 workspace 链接是否建立",
    detail:
      '$ pnpm -C packages/vue build\n' +
      "src/VirtList.ts:2:30 - error TS2307: Cannot find module '@virt-list/core'.\n" +
      '  提示：先在仓库根目录跑一次 pnpm install 建立 workspace 链接。',
  },
  {
    text: '测试超时：等待 ResizeObserver 回调超过 5000ms',
    detail:
      '$ pnpm vitest run MountRefresh\n' +
      ' FAIL  packages/react/__tests__/MountRefresh.test.ts > 挂载后自动补测\n' +
      ' Error: Test timed out in 5000ms.\n' +
      '   jsdom 不实现 ResizeObserver，需要在 setup 里注入 stub。',
  },
];

export function createTraceLine(seq: number): TraceLine {
  // 让四类事件按一个接近真实的比例出现：思考少、工具调用多、输出居中、错误偶发
  const roll = seq % 10;

  if (roll === 0) {
    return {
      id: uid++,
      seq,
      kind: 'thought',
      text: THOUGHTS[seq % THOUGHTS.length]!,
      tool: '',
      status: 'ok',
      ms: 0,
      outputKind: 'text',
      expanded: false,
    };
  }

  if (roll === 7) {
    const err = ERRORS[seq % ERRORS.length]!;
    return {
      id: uid++,
      seq,
      kind: 'error',
      text: err.text,
      tool: '',
      status: 'error',
      ms: 0,
      outputKind: 'terminal',
      detail: err.detail,
      expanded: false,
    };
  }

  if (roll % 2 === 1) {
    const tool = TOOLS[seq % TOOLS.length]!;
    return {
      id: uid++,
      seq,
      kind: 'tool',
      text: `${tool.name}(${tool.args})`,
      tool: tool.name,
      status: 'ok',
      ms: tool.ms,
      outputKind: tool.outputKind,
      detail: tool.output,
      expanded: false,
    };
  }

  return {
    id: uid++,
    seq,
    kind: 'output',
    text: OUTPUTS[seq % OUTPUTS.length]!,
    tool: '',
    status: 'ok',
    ms: 0,
    outputKind: 'text',
    expanded: false,
  };
}

export function generateTraceLines(count: number, startSeq = 0): TraceLine[] {
  return Array.from({ length: count }, (_, i) => createTraceLine(startSeq + i));
}

export const KIND_LABEL: Record<TraceKind, string> = {
  thought: '思考',
  tool: '工具',
  output: '输出',
  error: '错误',
};

/** 行首的状态图标：执行中用半填充的圆，终态用对勾和叉 */
export const STATUS_ICON: Record<TraceStatus, string> = {
  running: '◐',
  ok: '✓',
  error: '✗',
};
