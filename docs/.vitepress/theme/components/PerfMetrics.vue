<script setup lang="ts">
/**
 * 首页 hero 下方的硬指标条。
 *
 * 这里只放**不随设备变化**的事实：算法复杂度、DOM 规模、打包体积。
 * 具体的毫秒数交给下方的实测面板现场跑——在 hero 里写死耗时，换台机器就是假的。
 */
interface Metric {
  value: string;
  unit?: string;
  label: string;
  detail: string;
}

const METRICS: Metric[] = [
  {
    value: 'O(1)',
    label: '稳态滚动定位',
    detail: '每帧只跨越几项，成本与列表长度无关',
  },
  {
    value: 'O(√n)',
    label: '跳转任意位置',
    detail: '分块索引，不定高也不必逐项累加',
  },
  {
    value: '一屏',
    label: 'DOM 节点数',
    detail: '30 万行与 30 行的节点数相同',
  },
  {
    value: '6.1',
    unit: 'KB',
    label: 'gzip 体积',
    detail: 'VirtList 完整链路，核心零运行时依赖',
  },
];
</script>

<template>
  <div class="metrics">
    <div class="metrics-inner">
      <div v-for="m in METRICS" :key="m.label" class="metric">
        <div class="metric-value">
          {{ m.value }}<span v-if="m.unit" class="metric-unit">{{ m.unit }}</span>
        </div>
        <div class="metric-label">{{ m.label }}</div>
        <div class="metric-detail">{{ m.detail }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metrics {
  padding: 0 24px;
  margin: -16px auto 8px;
}

.metrics-inner {
  max-width: 1152px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.metric {
  padding: 20px 22px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  transition: border-color 0.25s, transform 0.25s;
}

.metric:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}

/*
 * 刻意不用等宽字体：等宽下的字母 O 与数字 0 几乎无法区分，
 * O(1) 会被读成 0(1)。这里用正文字体，配 tabular-nums 保持数字对齐。
 */
.metric-value {
  font-size: 30px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-brand-1);
}

.metric-unit {
  margin-left: 2px;
  font-size: 15px;
  font-weight: 600;
  opacity: 0.75;
}

.metric-label {
  margin-top: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.metric-detail {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.55;
  color: var(--vp-c-text-3);
}

@media (max-width: 900px) {
  .metrics-inner {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .metrics-inner {
    grid-template-columns: minmax(0, 1fr);
  }

  .metric {
    padding: 16px 18px;
  }

  .metric-value {
    font-size: 26px;
  }
}
</style>
