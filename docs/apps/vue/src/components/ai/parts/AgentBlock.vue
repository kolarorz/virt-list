<template>
  <!--
    正文。两条路径：
    - 搜索时按命中分段，显示 Markdown 的原始标记——命中位置和高亮位置必须严格一致，
      而渲染成加粗之后 `**` 就不在文本里了，位置对不上；
    - 平时按 Markdown 渲染。
  -->
  <div v-if="block.kind === 'text' && keyword" class="demo-agent-text">
    <template v-for="(part, i) in parts" :key="i"
      ><mark v-if="part.hit" class="demo-hit" :class="{ 'is-current': currentHit }">{{ part.text }}</mark
      ><span v-else>{{ part.text }}</span></template
    >
  </div>

  <div v-else-if="block.kind === 'text'" class="demo-agent-md">
    <template v-for="(line, i) in mdLines" :key="i">
      <div v-if="line.kind === 'blank'" class="demo-agent-md-gap" />
      <div v-else :class="lineClass(line)">
        <span v-if="line.marker" class="demo-agent-md-marker">{{ line.marker }}</span>
        <span
          ><template v-for="(span, j) in line.spans" :key="j"
            ><strong v-if="span.kind === 'strong'">{{ span.text }}</strong
            ><code v-else-if="span.kind === 'code'" class="demo-agent-inline-code">{{ span.text }}</code
            ><template v-else>{{ span.text }}</template></template
          ><span v-if="streaming && i === lastLine" class="demo-ai-caret" /></span
        >
      </div>
    </template>
  </div>

  <!-- 思考过程：默认折叠，展开状态存在数据里 -->
  <div v-else-if="block.kind === 'thinking'" class="demo-agent-thinking">
    <div class="demo-agent-thinking-head" @click="toggle">
      <span class="demo-agent-caret">{{ asThinking.expanded ? '▾' : '▸' }}</span>
      <span class="demo-agent-spark">✦</span>
      <span>思考 {{ asThinking.seconds }}s</span>
    </div>
    <div v-if="asThinking.expanded" class="demo-agent-thinking-body">
      <span>{{ asThinking.text }}</span>
      <span v-if="streaming" class="demo-ai-caret" />
    </div>
  </div>

  <!-- 代码块 -->
  <div v-else-if="block.kind === 'code'" class="demo-agent-code">
    <div class="demo-agent-code-head">
      <span>{{ asCode.lang }}</span>
      <button type="button" class="demo-agent-code-copy" @click="copyCode">
        {{ copied ? '已复制' : '⧉ 复制' }}
      </button>
    </div>
    <pre class="demo-agent-code-body"><div
      v-for="(line, i) in codeLines"
      :key="i"
      class="demo-agent-code-line"
      :class="{ 'is-comment': isComment(line) }"
    >{{ line || ' ' }}</div></pre>
  </div>

  <!-- 工具调用卡片：头部一行摘要，展开是终端回显或 diff -->
  <div
    v-else-if="block.kind === 'tool'"
    class="demo-agent-tool"
    :class="`is-${asTool.status}`"
  >
    <div class="demo-agent-tool-head" @click="toggle">
      <span class="demo-agent-caret">{{ asTool.expanded ? '▾' : '▸' }}</span>
      <span class="demo-agent-tool-icon">{{ STATUS_ICON[asTool.status] }}</span>
      <span class="demo-agent-tool-name">{{ asTool.name }}</span>
      <span class="demo-agent-tool-args">{{ asTool.args }}</span>
      <span class="demo-agent-tool-ms">
        {{ statusHint }}
      </span>
    </div>
    <div v-if="asTool.expanded" class="demo-agent-tool-body">
      <AgentOutput :text="asTool.output" :kind="asTool.outputKind" />
    </div>
  </div>

  <!-- 图表：加载完成的时机不可控，铺开那一下是最考验跟随的高度突变 -->
  <AgentChart v-else-if="block.kind === 'chart'" :chart="asChart" />

  <!-- 来源引用：横向滚动，卡片高度固定 -->
  <div v-else-if="block.kind === 'sources'" class="demo-agent-sources">
    <div v-for="(source, i) in asSources.items" :key="i" class="demo-agent-source">
      <div class="demo-agent-source-title">{{ source.title }}</div>
      <div class="demo-agent-source-site">{{ source.site }}</div>
      <div class="demo-agent-source-snippet">{{ source.snippet }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  formatMs,
  type AgentBlock,
  type AgentChartBlock,
  type AgentCodeBlock,
  type AgentSourcesBlock,
  type AgentTextBlock,
  type AgentThinkingBlock,
  type AgentToolBlock,
} from '../../../../../_shared/agentBlocks';
import { splitByKeyword } from '../../../../../_shared/highlight';
import { parseMarkdown, type MdLine } from '../../../../../_shared/markdown';
import AgentChart from './AgentChart.vue';
import AgentOutput from './AgentOutput.vue';

const props = defineProps<{
  block: AgentBlock;
  /** 这个块是不是正在流式生成的那一个（决定要不要挂光标） */
  streaming?: boolean;
  /** 搜索关键词，非空时正文按命中分段（搜索示例用） */
  keyword?: string;
  /** 这一条是不是当前那个命中，决定高亮用实底还是淡底 */
  currentHit?: boolean;
}>();

/** 执行中的圆、成功的勾、失败的叉、取消的斜杠——转起来的只有第二个 */
const STATUS_ICON = {
  queued: '○',
  running: '◐',
  ok: '✓',
  error: '✗',
  aborted: '⊘',
} as const;

/**
 * Vue 模板里的 v-if 不会收窄判别联合，所以先在这里各收窄一次。
 * 只在对应分支里使用，不会读到不存在的字段。
 */
const asText = computed(() => props.block as AgentTextBlock);
const asThinking = computed(() => props.block as AgentThinkingBlock);
const asCode = computed(() => props.block as AgentCodeBlock);
const asTool = computed(() => props.block as AgentToolBlock);
const asSources = computed(() => props.block as AgentSourcesBlock);
const asChart = computed(() => props.block as AgentChartBlock);

/** 卡片右侧那行小字：执行中和已取消没有耗时可言 */
const statusHint = computed(() => {
  const status = asTool.value.status;
  if (status === 'running') return '执行中…';
  if (status === 'aborted') return '已取消';
  return formatMs(asTool.value.ms);
});

const codeLines = computed(() => asCode.value.code.split('\n'));
const isComment = (line: string) => line.trimStart().startsWith('//');

/** 关键词高亮跟着 keyword 走，响应式框架下不需要手动清渲染池 */
const parts = computed(() => splitByKeyword(asText.value.text, props.keyword ?? ''));

const mdLines = computed(() => parseMarkdown(asText.value.text));
/** 光标挂在最后一个非空行上，否则流式遇到空行时它会孤零零地跳到下一段 */
const lastLine = computed(() => {
  for (let i = mdLines.value.length - 1; i >= 0; i -= 1) {
    if (mdLines.value[i]!.kind !== 'blank') return i;
  }
  return 0;
});

const LINE_CLASS: Record<string, string> = {
  para: 'demo-agent-md-p',
  bullet: 'demo-agent-md-li',
  ordered: 'demo-agent-md-li',
  quote: 'demo-agent-md-quote',
};

const lineClass = (line: MdLine) =>
  line.kind === 'heading' ? `demo-agent-md-h${line.level}` : LINE_CLASS[line.kind] ?? 'demo-agent-md-p';

/**
 * 展开 / 收起。
 *
 * 改的是 block 上的属性，也就是**列表数据本身**——不是组件内部的局部状态。
 * 这一点在虚拟列表里是必须的：项滚出视口会被回收，回来时重新渲染，
 * 局部状态会丢，写在数据里的展开状态不会。
 */
function toggle() {
  const block = props.block;
  if (block.kind === 'thinking' || block.kind === 'tool') {
    block.expanded = !block.expanded;
  }
}

const copied = ref(false);

function copyCode() {
  void navigator.clipboard?.writeText(asCode.value.code);
  copied.value = true;
  window.setTimeout(() => (copied.value = false), 1200);
}
</script>
