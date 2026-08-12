<template>
  <!-- 还在算：只占一行，铺开时高度会突然涨一百多像素 -->
  <div v-if="chart.loading" class="demo-agent-chart is-loading">
    <div class="demo-agent-skeleton">
      <span>{{ chart.title }}</span>
      <span class="demo-agent-skeleton-bar" />
    </div>
  </div>

  <div v-else class="demo-agent-chart">
    <!-- 单系列不需要图例：标题就说明了这些条形是什么 -->
    <div class="demo-agent-chart-title">{{ chart.title }}<span class="demo-agent-chart-unit">（{{ chart.unit }}）</span></div>
    <div class="demo-agent-chart-rows">
      <div
        v-for="item in chart.items"
        :key="item.label"
        class="demo-agent-chart-row"
        :title="`${item.label}：${item.value} ${chart.unit}`"
      >
        <span class="demo-agent-chart-label">{{ item.label }}</span>
        <span class="demo-agent-chart-track">
          <span class="demo-agent-chart-bar" :style="{ width: `${percent(item.value)}%` }" />
        </span>
        <!-- 只有五条，每条都直接标数值；数值用文字色，不用条形的颜色 -->
        <span class="demo-agent-chart-value">{{ item.value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AgentChartBlock } from '../../../../../_shared/agentBlocks';

/**
 * 横向条形图，用 HTML 而不是 SVG。
 *
 * 理由是这里的约束和一般图表不同：它长在虚拟列表的项里。HTML 版本每条只要三个
 * 节点、宽度用百分比表达（容器一变自动跟随，不需要重算坐标），颜色走 --demo-*
 * 令牌因此亮暗双主题都对。SVG 在这三点上都要多付代价，而这个图形简单到用不上
 * SVG 的表达力。
 */
const props = defineProps<{ chart: AgentChartBlock }>();

/** 条长按最大值归一化，不从 0 起画刻度——五条之间的相对关系才是要看的 */
const max = computed(() => Math.max(...props.chart.items.map((i) => i.value), 0.001));
const percent = (value: number) => Math.max(2, (value / max.value) * 100);
</script>
