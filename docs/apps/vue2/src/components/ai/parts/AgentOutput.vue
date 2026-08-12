<template>
  <!-- 终端回显：命令行提亮，成功/失败的行分别染色 -->
  <pre v-if="kind === 'terminal'" class="demo-agent-term"><div
    v-for="(line, i) in lines"
    :key="i"
    class="demo-agent-term-line"
    :class="termClass(line)"
  >{{ line || ' ' }}</div></pre>

  <!-- 统一 diff：整行铺底，靠色块的形状读改动 -->
  <pre v-else-if="kind === 'diff'" class="demo-agent-diff"><div
    v-for="(line, i) in lines"
    :key="i"
    class="demo-agent-diff-line"
    :class="diffClass(line)"
  >{{ line || ' ' }}</div></pre>

  <!-- 普通文本输出 -->
  <pre v-else class="demo-agent-term">{{ text }}</pre>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ToolOutputKind } from '../../../../../_shared/agentBlocks';

/**
 * 工具输出的渲染，消息里的工具卡与 Agent 执行流两个示例共用。
 *
 * 这里不做语法高亮：示例本身是性能演示，为了给输出上色而引一个高亮器
 * （连主题带语法约 60KB gzip）不合适。按行做几个廉价判断，观感已经足够。
 */
const props = defineProps<{
  text: string;
  kind: ToolOutputKind;
}>();

const lines = computed(() => props.text.split('\n'));

function termClass(line: string) {
  if (line.startsWith('$')) return 'is-cmd';
  if (/error|FAIL|failed|exit code|超时/i.test(line)) return 'is-fail';
  if (/passed|通过|Duration/.test(line)) return 'is-pass';
  return '';
}

function diffClass(line: string) {
  if (line.startsWith('@@')) return 'is-hunk';
  if (line.startsWith('+')) return 'is-add';
  if (line.startsWith('-')) return 'is-del';
  return '';
}
</script>
