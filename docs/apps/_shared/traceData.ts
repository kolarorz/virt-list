/**
 * Agent 执行流 / 日志视图的造数据，五个框架共用。
 *
 * 这类视图和聊天列表的差别在于「节奏」：日志是持续高频追加的，一秒十几行很常见，
 * 而且随时可能一次性灌进上万行（切到历史任务、展开一个批处理阶段）。
 */

export type TraceKind = 'thought' | 'tool' | 'output' | 'error';

export interface TraceLine {
  id: number;
  /** 行号，界面上显示 */
  seq: number;
  kind: TraceKind;
  text: string;
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

const TOOLS = [
  { name: 'read_file', args: 'path=packages/core/src/VirtListCore.ts', lines: 1779 },
  { name: 'grep', args: 'pattern=stickyBottom, glob=**/*.ts', lines: 42 },
  { name: 'bash', args: 'cmd=pnpm vitest run --reporter=dot', lines: 128 },
  { name: 'edit_file', args: 'path=packages/core/src/types.ts', lines: 12 },
  { name: 'list_dir', args: 'path=docs/apps/vanilla/src/components', lines: 64 },
];

const OUTPUTS = [
  '已定位到 3 处需要修改的位置，开始逐个处理',
  '900 个测试全部通过，用时 8.46s',
  '类型检查通过，没有新增告警',
  '构建产物 gzip 后 6.1KB，与改动前持平',
  '已写入 4 个文件，新增 187 行、删除 23 行',
];

const ERRORS = [
  '命令退出码 1：Type \'false\' is not assignable to type \'true\'',
  '找不到模块 \'@virt-list/core\'，检查 workspace 链接是否建立',
  '测试超时：等待 ResizeObserver 回调超过 5000ms',
];

/** 造一段工具调用的详情，撑得够高才能看出展开/收起时的高度剧变 */
function toolDetail(tool: (typeof TOOLS)[number]): string {
  return Array.from(
    { length: 8 },
    (_, i) =>
      `  ${String(i + 1).padStart(3, ' ')} │ ${tool.name} 返回的第 ${i + 1} 段内容，共 ${tool.lines} 行，此处按需截断显示`,
  ).join('\n');
}

export function createTraceLine(seq: number): TraceLine {
  // 让四类事件按一个接近真实的比例出现：思考少、工具调用多、输出居中、错误偶发
  const roll = seq % 10;
  if (roll === 0) {
    return { id: uid++, seq, kind: 'thought', text: THOUGHTS[seq % THOUGHTS.length]!, expanded: false };
  }
  if (roll === 7) {
    return { id: uid++, seq, kind: 'error', text: ERRORS[seq % ERRORS.length]!, expanded: false };
  }
  if (roll % 2 === 1) {
    const tool = TOOLS[seq % TOOLS.length]!;
    return {
      id: uid++,
      seq,
      kind: 'tool',
      text: `${tool.name}(${tool.args})`,
      detail: toolDetail(tool),
      expanded: false,
    };
  }
  return { id: uid++, seq, kind: 'output', text: OUTPUTS[seq % OUTPUTS.length]!, expanded: false };
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
