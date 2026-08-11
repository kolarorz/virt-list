<template>
  <div class="demo-panel">
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-outline-layout">
      <div class="demo-list-container demo-trace">
        <VirtList
          ref="vlRef"
          :list="list"
          item-key="id"
          :estimated-size="24"
          :has-more-top="false"
          :has-more-bottom="false"
          :copy-text="copyText"
          @update="onUpdate"
        >
          <template #default="{ itemData }">
            <div class="demo-trace-line" :class="`kind-${itemData.kind}`">
              <div class="demo-trace-head">
                <span class="demo-trace-seq">{{ String(itemData.seq).padStart(5, ' ') }}</span>
                <span class="demo-trace-badge">{{ kindLabel(itemData.kind) }}</span>
                <span class="demo-trace-text">{{ itemData.text }}</span>
              </div>
            </div>
          </template>
        </VirtList>
      </div>
      <!--
        每段一个色块，flex-grow 取段内行数——高度天然等于这一段在整个日志里的占比，
        不需要自己算像素
      -->
      <div class="demo-outline">
        <button
          v-for="(section, i) in sections"
          :key="section.index"
          type="button"
          class="demo-outline-block"
          :class="[`kind-${section.kind}`, { 'is-active': i === current }]"
          :style="{ flexGrow: section.count }"
          :title="sectionTitle(section)"
          @click="jumpTo(section.index)"
        />
      </div>
    </div>
    <div class="demo-chat-toolbar">
      <span class="demo-hint">
        右侧每个色块是一个执行阶段，高度按行数分配、颜色按段内最严重的事件。
        点色块跳到该段，悬停看标题。
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { VirtList } from '@virt-list/vue';
import {
  generateTraceLines,
  KIND_LABEL,
  type TraceKind,
  type TraceLine,
} from '../../../../_shared/traceData';
import { activeSection, buildOutline, type OutlineSection } from '../../../../_shared/outline';

const COUNT = 3000;

const vlRef = ref<typeof VirtList | null>(null);
const list = ref<TraceLine[]>(generateTraceLines(COUNT));
const current = ref(0);
const listState = ref<any>(null);

/** 分段是纯数据计算，列表不变就不用重算 */
const sections = computed(() => buildOutline(list.value));

const kindLabel = (kind: string) => KIND_LABEL[kind as TraceKind] ?? kind;

const copyText = (item: TraceLine) =>
  `[${KIND_LABEL[item.kind]}] ${String(item.seq).padStart(5, ' ')}  ${item.text}`;

const sectionTitle = (section: OutlineSection) =>
  `${section.title}（${section.count} 行${section.errors > 0 ? `，${section.errors} 个错误` : ''}）`;

const statsText = computed(() => {
  const section = sections.value[current.value];
  return [
    `行数: ${list.value.length}`,
    `阶段: ${sections.value.length} 段`,
    `当前: 第 ${current.value + 1} 段`,
    section ? `「${section.title.slice(0, 18)}」` : '',
    `渲染区间: ${listState.value?.renderBegin ?? '-'} - ${listState.value?.renderEnd ?? '-'}`,
  ]
    .filter(Boolean)
    .join(' | ');
});

function jumpTo(index: number) {
  vlRef.value?.scrollToIndex(index, { align: 'start' });
}

function onUpdate(_list: TraceLine[], state: any) {
  listState.value = state;
  current.value = activeSection(sections.value, state?.inViewBegin ?? 0);
}
</script>
